import { Inputs } from "./inputs";
import { ContainerImages } from "../container-image-versions";
import { defineInputsGitLab, defineJobGitLab } from "../lib/JobBuilderGitLab";
import { defineInputsGitHub, defineJobGitHub } from "../lib/JobBuilderGitHub";

const AttestConfig = {
  devguard_api_url: Inputs.devguard_api_url,
  devguard_asset_name: Inputs.devguard_asset_name,
  devguard_artifact_name: Inputs.devguard_artifact_name,
  image_suffix: Inputs.image_suffix,
};

const should_deploy = {
  description: "Should the attestation job run",
  default: true as const,
  type: "boolean" as const,
};

export const AttestJobInputs = defineInputsGitLab({
  ...AttestConfig,
  devguard_token: Inputs.devguard_token,

  runner_tags: Inputs.runner_tags,
  stage: {
    ...Inputs.stage,
    default: "attestation" as const,
  },
  job_suffix: Inputs.job_suffix,
  git_strategy: Inputs.git_strategy,
  pull_policy: Inputs.pull_policy,
  allow_failure: Inputs.allow_failure,
  needs: Inputs.needs,

  default_ref: Inputs.default_ref,
  commit_ref: Inputs.commit_ref,

  registry: Inputs.registry,
  registry_user: Inputs.registry_user,
  registry_password: Inputs.registry_password,

  attestations: Inputs.attestations,
  image: Inputs.image,
});

export const AttestTemplate = defineJobGitLab(AttestJobInputs, (inputValues) => ({
  name: `devguard:attest${inputValues.job_suffix}`,
  job: {
    image: {
      name: ContainerImages.DEVGUARD_SCANNER,
      pull_policy: inputValues.pull_policy,
      entrypoint: [""],
    },
    tags: inputValues.runner_tags,
    stage: inputValues.stage,
    allow_failure: inputValues.allow_failure,
    needs: inputValues.needs,
    variables: {
      GIT_STRATEGY: inputValues.git_strategy,
    },
    script: `echo "Attesting artifacts for ${inputValues.image}"
echo "Artifact Name: ${inputValues.devguard_artifact_name}"
echo "Asset Name: ${inputValues.devguard_asset_name}"

# URL encode artifact name for API calls
API_ARTIFACT_NAME=$(python3 -c "from urllib.parse import quote; print(quote('${inputValues.devguard_artifact_name}', safe=''))")
echo "API Encoded Artifact Name: $API_ARTIFACT_NAME"

# Slugify the commit ref (replace special characters with hyphens)
API_COMMIT_REF=$(devguard-scanner slug "${inputValues.commit_ref}")
echo "Slugified Commit Ref: $API_COMMIT_REF"

# Login to registry
devguard-scanner login -u ${inputValues.registry_user} -p ${inputValues.registry_password} ${inputValues.registry}

echo 'Attestations: ${Array.isArray(inputValues.attestations) ? JSON.stringify(inputValues.attestations) : inputValues.attestations}'

ATT_JSON_CLEAN=$(echo '${Array.isArray(inputValues.attestations) ? JSON.stringify(inputValues.attestations) : inputValues.attestations}' \\
| sed 's/:\\([a-z_]\\+\\)=>/"\\1":/g' \\
| sed 's/=>/:/g' \\
| sed "s/'/\\"/g")

ATTESTATIONS_JSON=$(echo "$ATT_JSON_CLEAN" | jq . )

# Process each attestation
echo "$ATTESTATIONS_JSON" | jq -c '.[]' | while read -r attestation; do
  SOURCE=$(echo "$attestation" | jq -r '.source')
  PREDICATE_TYPE=$(echo "$attestation" | jq -r '.predicate_type')

  echo ""
  echo "========================================"
  echo "Processing attestation with predicate: $PREDICATE_TYPE"
  SOURCE=$(echo "$SOURCE" | envsubst)

  # Check if source is a URL (starts with http:// or https://)
  if [[ "$SOURCE" =~ ^https?:// ]]; then
    # Replace ARTIFACT_NAME placeholder with URL-encoded artifact name
    URL="\${SOURCE//ARTIFACT_NAME/$API_ARTIFACT_NAME}"

    # Replace COMMIT_REF placeholder with URL-encoded commit ref
    URL="\${URL//COMMIT_REF/$API_COMMIT_REF}"

    # Also handle any environment variable substitution
    URL=$(echo "$URL" | envsubst)

    # Extract filename from URL or use a default
    FILENAME=$(basename "$URL" | cut -d'?' -f1)
    if [ -z "$FILENAME" ] || [ "$FILENAME" = "/" ]; then
      FILENAME="downloaded-$(echo "$PREDICATE_TYPE" | md5sum | cut -d' ' -f1).json"
    fi

    echo "Downloading from URL: $URL"
    echo "Saving as: $FILENAME"

    devguard-scanner curl "$URL" --token="${inputValues.devguard_token}" > "/tmp/$FILENAME"
    FILE_PATH="/tmp/$FILENAME"
  else
    # It's a file path
    FILE_PATH="$SOURCE"
    echo "Using local file: $FILE_PATH"
  fi

  # Create attestation
  if [ -f "$FILE_PATH" ]; then
    echo "Creating attestation for $FILE_PATH"
    devguard-scanner attest "$FILE_PATH" \\
      --predicateType="$PREDICATE_TYPE" \\
      ${inputValues.image} \\
      --defaultRef="${inputValues.default_ref}" \\
      --ref="${inputValues.commit_ref}" \\
      --token="${inputValues.devguard_token}" \\
      --apiUrl="${inputValues.devguard_api_url}" \\
      --assetName="${inputValues.devguard_asset_name}" \\
      --artifactName="${inputValues.devguard_artifact_name}"
    echo "✓ Attestation created successfully"
  else
    echo "✗ Warning: File $FILE_PATH not found, skipping attestation"
  fi
  echo "========================================"
done

echo ""
echo "All attestations completed"
`,
  },
}));

export const AttestJobInputsGitHub = defineInputsGitHub({
  ...AttestConfig,
  should_deploy,
});

export const AttestTemplateGitHub = defineJobGitHub(AttestJobInputsGitHub, (inputValues) => ({
  name: "devguard:attest",
  secrets: {
    "devguard-token": {
      description: "DevGuard API token",
      required: true,
    },
  },
  job: {
    "runs-on": "ubuntu-latest",
    if: "inputs.should_deploy",
    steps: [
      {
        name: "Download image-digest artifact (can be created by build-image)",
        uses: "actions/download-artifact@v4",
        with: {
          name: `image-digest\${{ inputs.image_suffix }}`,
          path: ".",
        },
        "continue-on-error": true,
      },
      {
        name: "Download image-tag artifact (can be created by build-image)",
        uses: "actions/download-artifact@v4",
        with: {
          name: `image-tag\${{ inputs.image_suffix }}`,
          path: ".",
        },
      },
      {
        name: "Download artifact purl (can be created by build-image)",
        uses: "actions/download-artifact@v4",
        with: {
          name: `artifact-purl\${{ inputs.image_suffix }}`,
        },
        if: "inputs.devguard_artifact_name == ''",
      },
      {
        name: "Download safe-artifact (can be created by build-image)",
        uses: "actions/download-artifact@v4",
        with: {
          name: `artifact-purl-safe\${{ inputs.image_suffix }}`,
        },
        if: "inputs.devguard_artifact_name == ''",
      },
      {
        name: "set artifact-name variable if it is empty",
        run: `if [ -z "\${{ inputs.devguard_artifact_name }}" ] && [ -f artifact-purl.txt ]; then
  echo "ARTIFACT_NAME=$(cat artifact-purl.txt)" >> $GITHUB_ENV
  echo "Using artifact name from file: $ARTIFACT_NAME"
  # For API calls, use safe artifact name if it exists
  if [ -f artifact-purl-safe.txt ]; then
    echo "API_ARTIFACT_NAME=$(cat artifact-purl-safe.txt)" >> $GITHUB_ENV
  else
    echo "API_ARTIFACT_NAME=$(cat artifact-purl.txt)" >> $GITHUB_ENV
  fi
else
  # make sure to url encode
  echo "ARTIFACT_NAME=\${{ inputs.devguard_artifact_name }}" >> $GITHUB_ENV
  echo "API_ARTIFACT_NAME=$(echo -n "\${{ inputs.devguard_artifact_name }}" | jq -s -R -r @uri)" >> $GITHUB_ENV
  echo "Using provided artifact name: \${{ inputs.devguard_artifact_name }}"
  echo "Encoded: $API_ARTIFACT_NAME"
fi
echo "Resolved artifact name for attestation: \${{ inputs.devguard_artifact_name }}"`,
      },
      {
        name: "Get and Attest SBOM",
        uses: "docker://" + ContainerImages.DEVGUARD_SCANNER,
        with: {
          args: `sh -c "
  slug=$(devguard-scanner slug \${{ github.ref_name }}) &&
  artifact_name="$ARTIFACT_NAME" &&
  echo 'Fetching SBOM for artifact:' '\${{ env.API_ARTIFACT_NAME }}' &&
  devguard-scanner curl '\${{ inputs.devguard_api_url }}/api/v1/organizations/\${{ inputs.devguard_asset_name }}/refs/'$slug'/artifacts/\${{ env.API_ARTIFACT_NAME }}/sbom.json/' --token='\${{ secrets.devguard-token }}' > /tmp/sbom.json &&
  echo 'SBOM downloaded to /tmp/sbom.json' &&
  if [ -f image-digest.txt ]; then
    echo 'Attesting SBOM with image digest present' &&
    devguard-scanner attest -u \${{ github.actor }} -r ghcr.io -p \${{ secrets.GITHUB_TOKEN }} /tmp/sbom.json --predicateType='https://cyclonedx.org/bom' \\"$(cat image-tag.txt)@$(cat image-digest.txt)\\" --token='\${{ secrets.devguard-token }}' --apiUrl=\${{ inputs.devguard_api_url }} --assetName=\${{ inputs.devguard_asset_name }} --ref=\${{ github.ref_name }} --artifactName="$artifact_name"
  else
    echo 'Attesting SBOM without image digest' &&
    devguard-scanner attest /tmp/sbom.json --predicateType='https://cyclonedx.org/bom' --token='\${{ secrets.devguard-token }}' --apiUrl=\${{ inputs.devguard_api_url }} --assetName=\${{ inputs.devguard_asset_name }} --ref=\${{ github.ref_name }} --artifactName="$artifact_name"
  fi
"`,
        },
        env: {
          API_ARTIFACT_NAME: "${{ env.API_ARTIFACT_NAME }}",
          ARTIFACT_NAME: "${{ env.ARTIFACT_NAME }}",
        } as Record<string, string>,
      },
      {
        name: "Get and Attest VeX",
        uses: "docker://" + ContainerImages.DEVGUARD_SCANNER,
        with: {
          args: `sh -c "
  slug=$(devguard-scanner slug \${{ github.ref_name }}) &&
  artifact_name="$ARTIFACT_NAME" &&
  echo 'Fetching VeX for artifact:' '\${{ env.API_ARTIFACT_NAME }}' &&
  devguard-scanner curl '\${{ inputs.devguard_api_url }}/api/v1/organizations/\${{ inputs.devguard_asset_name }}/refs/'$slug'/artifacts/\${{ env.API_ARTIFACT_NAME }}/vex.json/' --token='\${{ secrets.devguard-token }}' > /tmp/vex.json &&
  echo 'VeX downloaded to /tmp/vex.json' &&
  if [ -f image-digest.txt ]; then
    echo 'Attesting VeX with image digest present' &&
    devguard-scanner attest -u \${{ github.actor }} -r ghcr.io -p \${{ secrets.GITHUB_TOKEN }} /tmp/vex.json \\"$(cat image-tag.txt)@$(cat image-digest.txt)\\" --token='\${{ secrets.devguard-token }}' --predicateType='https://cyclonedx.org/vex' --apiUrl=\${{ inputs.devguard_api_url }} --assetName=\${{ inputs.devguard_asset_name }} --ref=\${{ github.ref_name }} --artifactName="$artifact_name"
  else
    echo 'Attesting VeX without image digest' &&
    devguard-scanner attest /tmp/vex.json --predicateType='https://cyclonedx.org/vex' --token='\${{ secrets.devguard-token }}' --apiUrl=\${{ inputs.devguard_api_url }} --assetName=\${{ inputs.devguard_asset_name }} --ref=\${{ github.ref_name }} --artifactName="$artifact_name"
  fi
"`,
        },
        env: {
          API_ARTIFACT_NAME: "${{ env.API_ARTIFACT_NAME }}",
          ARTIFACT_NAME: "${{ env.ARTIFACT_NAME }}",
        } as Record<string, string>,
      },
      {
        name: "Get and Attest SAST-Results",
        uses: "docker://" + ContainerImages.DEVGUARD_SCANNER,
        with: {
          args: `sh -c "
  slug=$(devguard-scanner slug \${{ github.ref_name }}) &&
  artifact_name="$ARTIFACT_NAME" &&
  echo 'Fetching SAST results for artifact:' '\${{ env.ARTIFACT_NAME }}' &&
  devguard-scanner curl '\${{ inputs.devguard_api_url }}/api/v1/organizations/\${{ inputs.devguard_asset_name }}/refs/'$slug'/sarif.json' --token='\${{ secrets.devguard-token }}' > /tmp/sarif.json &&
  echo 'SAST results downloaded to /tmp/sarif.json' &&
  if [ -f image-digest.txt ]; then
    echo 'Attesting SAST results with image digest present' &&
    devguard-scanner attest -u \${{ github.actor }} -r ghcr.io -p \${{ secrets.GITHUB_TOKEN }} /tmp/sarif.json \\"$(cat image-tag.txt)@$(cat image-digest.txt)\\" --predicateType='https://www.schemastore.org/schemas/json/sarif-2.1.0.json' --token='\${{ secrets.devguard-token }}' --apiUrl=\${{ inputs.devguard_api_url }} --assetName=\${{ inputs.devguard_asset_name }} --ref=\${{ github.ref_name }} --artifactName="$artifact_name"
  else
    echo 'Attesting SAST results without image digest' &&
    devguard-scanner attest /tmp/sarif.json --predicateType='https://www.schemastore.org/schemas/json/sarif-2.1.0.json' --token='\${{ secrets.devguard-token }}' --apiUrl=\${{ inputs.devguard_api_url }} --assetName=\${{ inputs.devguard_asset_name }} --ref=\${{ github.ref_name }} --artifactName="$artifact_name"
  fi
"`,
        },
        env: {
          ARTIFACT_NAME: "${{ env.ARTIFACT_NAME }}",
        } as Record<string, string>,
      },
      {
        name: "Download and Attest build-provenance.json",
        uses: "actions/download-artifact@v4",
        with: {
          name: `build\${{ inputs.image_suffix }}.provenance.json`,
        },
      },
      {
        name: "Attest build-provenance.json",
        uses: "docker://" + ContainerImages.DEVGUARD_SCANNER,
        "continue-on-error": true,
        with: {
          args: `sh -c "
  artifact_name="$ARTIFACT_NAME" &&
  echo 'Building provenance attestation for artifact:' '\${{ env.ARTIFACT_NAME }}' &&
  if [ -f image-digest.txt ]; then
    echo 'Attesting provenance with image digest present' &&
    devguard-scanner attest -u \${{ github.actor }} -r ghcr.io -p \${{ secrets.GITHUB_TOKEN }} build.provenance.json \\"$(cat image-tag.txt)@$(cat image-digest.txt)\\" --predicateType='https://slsa.dev/provenance/v1' --token='\${{ secrets.devguard-token }}' --apiUrl=\${{ inputs.devguard_api_url }} --assetName=\${{ inputs.devguard_asset_name }} --ref=\${{ github.ref_name }} --artifactName="$artifact_name"
  else
    echo 'Attesting provenance without image digest' &&
    devguard-scanner attest build.provenance.json --token='\${{ secrets.devguard-token }}' --apiUrl=\${{ inputs.devguard_api_url }} --predicateType='https://slsa.dev/provenance/v1' --assetName=\${{ inputs.devguard_asset_name }} --ref=\${{ github.ref_name }} --artifactName="$artifact_name"
  fi
"`,
        },
        env: {
          ARTIFACT_NAME: "${{ env.ARTIFACT_NAME }}",
        } as Record<string, string>,
      },
    ],
  },
}));
