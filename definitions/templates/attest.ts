import { Inputs } from "./inputs"
import { ContainerImages } from "../container-image-versions";
import { defineInputs, defineJob } from "../lib/JobWithSpecBuilder";

export const AttestJobInputs = defineInputs({
devguard_api_url: Inputs.devguard_api_url,
        devguard_asset_name: Inputs.devguard_asset_name,
        devguard_token: Inputs.devguard_token,
        devguard_artifact_name: Inputs.devguard_artifact_name,

        runner_tags: Inputs.runner_tags,
        stage: {
            ...Inputs.stage,
            default: 'attestation' as const,
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

export const AttestTemplate = defineJob(AttestJobInputs, (inputValues) => ({
    name: `devguard:attest${inputValues.job_suffix}`,
    job: {
        image: {
            name: ContainerImages.DEVGUARD_SCANNER,
            pull_policy: inputValues.pull_policy as any,
            entrypoint: [""],
        },
        tags: inputValues.runner_tags as any,
        stage: inputValues.stage,
        allow_failure: inputValues.allow_failure as any,
        needs: inputValues.needs as any,
        variables: {
            GIT_STRATEGY: inputValues.git_strategy as any,
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

echo 'Attestations: ${JSON.stringify(inputValues.attestations)}'

# Login to registry
devguard-scanner login -u ${inputValues.registry_user} -p ${inputValues.registry_password} ${inputValues.registry}

ATT_JSON_CLEAN=$(echo '${JSON.stringify(inputValues.attestations)}' \\
| sed 's/:\\([a-z_]\\+\\)=>/"\\1":/g' \\
| sed 's/=>/:/g' \\
| sed "s/'/\\"/g")
# Convert inputs.attestations to a valid JSON array if it's an array of JSON strings

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
` as any,
    }
}));