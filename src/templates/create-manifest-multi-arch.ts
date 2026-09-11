import { defineInputsGitLab, defineJobGitLab } from "../lib/JobBuilderGitLab";
import { defineInputsGitHub, defineJobGitHub } from "../lib/JobBuilderGitHub";
import { InputGroups, Inputs, Secrets } from "./inputs";
import { ContainerImages } from "../container-image-versions";
import { ACTIONS_DOWNLOAD_ARTIFACT, DOCKER_LOGIN_ACTION } from "../actions-versions";
import { GitHubReusableSteps } from "../github-resusable-steps";

const CreateManifestMultiArchSigningInputs = {
  devguard_api_url: Inputs.devguard_api_url,
  devguard_asset_name: Inputs.devguard_asset_name,
  devguard_artifact_name: Inputs.devguard_artifact_name,
  commit_ref: Inputs.commit_ref,
  is_tag: Inputs.is_tag,
};

export const CreateManifestMultiArchJobInputs = defineInputsGitLab({
  stage: {
    ...Inputs.stage,
    default: "oci-image" as const,
  },
  needs: Inputs.needs,
  dependencies: Inputs.dependencies,
  job_suffix: Inputs.job_suffix,
  upstream_version: Inputs.upstream_version,
  create_root_manifest: Inputs.create_root_manifest,
  artifacts_subdirectory: Inputs.artifacts_subdirectory,
  devguard_token: Inputs.devguard_token,
  ...CreateManifestMultiArchSigningInputs,
});

export const CreateManifestMultiArchJobInputsGitHub = defineInputsGitHub({
  upstream_version: Inputs.upstream_version,
  create_root_manifest: Inputs.create_root_manifest,
  image_suffix: Inputs.image_suffix,
  ...InputGroups.registry,
  ...CreateManifestMultiArchSigningInputs,
});

export const CreateManifestMultiArchTemplateGitHub = defineJobGitHub(CreateManifestMultiArchJobInputsGitHub, (inputValues) => ({
  name: "devguard:create-manifest-multi-arch",
  secrets: {
    "registry-password": Secrets["registry-password"],
    "devguard-token": Secrets["devguard-token"],
  },
  job: {
    "runs-on": "ubuntu-latest",
    permissions: {
      packages: "write",
    },
    steps: [
      GitHubReusableSteps.ResolveRegistryPassword,
      {
        name: "Download amd64 image-tag",
        uses: ACTIONS_DOWNLOAD_ARTIFACT,
        with: {
          name: `image-tag${ inputValues.image_suffix }-amd64`,
          path: "amd64",
        },
      },
      {
        name: "Download arm64 image-tag",
        uses: ACTIONS_DOWNLOAD_ARTIFACT,
        with: {
          name: `image-tag${ inputValues.image_suffix }-arm64`,
          path: "arm64",
        },
      },
      GitHubReusableSteps.DockerLogin(inputValues.registry, inputValues.registry_user),
      {
        name: "Create and push multi-arch manifest",
        env: {
          CREATE_ROOT_MANIFEST: `${ inputValues.create_root_manifest }`,
        },
        run: `AMD64_TAG=$(cat amd64/image-tag.txt)
ARM64_TAG=$(cat arm64/image-tag.txt)

if [ -z "$AMD64_TAG" ] || [ -z "$ARM64_TAG" ]; then
  echo "ERROR: Could not read arch-specific IMAGE_TAG from image-tag artifacts"
  exit 1
fi

echo "amd64: $AMD64_TAG"
echo "arm64: $ARM64_TAG"

BASE_TAG="\${AMD64_TAG%-amd64}"

echo "Creating manifest: $BASE_TAG -> $AMD64_TAG + $ARM64_TAG"
docker manifest create "$BASE_TAG" "$AMD64_TAG" "$ARM64_TAG"
docker manifest push "$BASE_TAG"

MANIFEST_TAGS="$BASE_TAG"

if [ "$CREATE_ROOT_MANIFEST" = "true" ]; then
  ROOT_TAG=$(echo "$BASE_TAG" | sed "s/-\${GITHUB_REF_NAME}//")
  if [ "$ROOT_TAG" != "$BASE_TAG" ]; then
    echo "Creating root manifest: $ROOT_TAG"
    docker manifest create "$ROOT_TAG" "$AMD64_TAG" "$ARM64_TAG"
    docker manifest push "$ROOT_TAG"
    MANIFEST_TAGS="$MANIFEST_TAGS $ROOT_TAG"
  fi
fi

echo "MANIFEST_TAGS=$MANIFEST_TAGS" >> $GITHUB_ENV`,
      },
      {
        name: "Sign multi-arch manifest(s)",
        env: {
          DEVGUARD_TOKEN: "${{ secrets.devguard-token }}",
        } as Record<string, string>,
        run: `for TAG in $MANIFEST_TAGS; do
  echo "Signing manifest: $TAG"
  docker run --rm ${ ContainerImages.DEVGUARD_SCANNER } devguard-scanner sign -u ${ inputValues.registry_user } -r ${ inputValues.registry } -p "\${{ env.REGISTRY_PASSWORD }}" --token="$DEVGUARD_TOKEN" "$TAG" --offline
done`,
      },
      {
        name: "Download amd64 build provenance",
        uses: ACTIONS_DOWNLOAD_ARTIFACT,
        with: {
          name: `build${ inputValues.image_suffix }-amd64.provenance.json`,
        },
        "continue-on-error": true,
      },
      {
        name: "Rename amd64 build provenance",
        run: `[ -f build.provenance.json ] && mv build.provenance.json amd64.provenance.json || true`,
      },
      {
        name: "Download arm64 build provenance",
        uses: ACTIONS_DOWNLOAD_ARTIFACT,
        with: {
          name: `build${ inputValues.image_suffix }-arm64.provenance.json`,
        },
        "continue-on-error": true,
      },
      {
        name: "Rename arm64 build provenance",
        run: `[ -f build.provenance.json ] && mv build.provenance.json arm64.provenance.json || true`,
      },
      {
        name: "Download amd64 artifact purl (can be created by build-image)",
        uses: ACTIONS_DOWNLOAD_ARTIFACT,
        with: {
          name: `artifact-purl${ inputValues.image_suffix }-amd64`,
          path: "amd64",
        },
        if: "inputs.devguard_artifact_name == ''",
      },
      {
        name: "Download amd64 safe-artifact (can be created by build-image)",
        uses: ACTIONS_DOWNLOAD_ARTIFACT,
        with: {
          name: `artifact-purl-safe${ inputValues.image_suffix }-amd64`,
          path: "amd64",
        },
        if: "inputs.devguard_artifact_name == ''",
      },
      {
        name: "Download arm64 artifact purl (can be created by build-image)",
        uses: ACTIONS_DOWNLOAD_ARTIFACT,
        with: {
          name: `artifact-purl${ inputValues.image_suffix }-arm64`,
          path: "arm64",
        },
        if: "inputs.devguard_artifact_name == ''",
      },
      {
        name: "Download arm64 safe-artifact (can be created by build-image)",
        uses: ACTIONS_DOWNLOAD_ARTIFACT,
        with: {
          name: `artifact-purl-safe${ inputValues.image_suffix }-arm64`,
          path: "arm64",
        },
        if: "inputs.devguard_artifact_name == ''",
      },
      {
        name: "set amd64 artifact-name variable if it is empty",
        env: {
          DEVGUARD_ARTIFACT_NAME: `${ inputValues.devguard_artifact_name }`,
        },
        run: `if [ -z "$DEVGUARD_ARTIFACT_NAME" ] && [ -f amd64/artifact-purl.txt ]; then
  if [ -f amd64/artifact-purl-safe.txt ]; then
    echo "AMD64_API_ARTIFACT_NAME=$(cat amd64/artifact-purl-safe.txt)" >> $GITHUB_ENV
  else
    echo "AMD64_API_ARTIFACT_NAME=$(cat amd64/artifact-purl.txt)" >> $GITHUB_ENV
  fi
  echo "Using artifact name from file: $(cat amd64/artifact-purl.txt)"
else
  echo "AMD64_API_ARTIFACT_NAME=$(echo -n "$DEVGUARD_ARTIFACT_NAME" | jq -s -R -r @uri)" >> $GITHUB_ENV
  echo "Using provided artifact name: $DEVGUARD_ARTIFACT_NAME"
fi`,
      },
      {
        name: "set arm64 artifact-name variable if it is empty",
        env: {
          DEVGUARD_ARTIFACT_NAME: `${ inputValues.devguard_artifact_name }`,
        },
        run: `if [ -z "$DEVGUARD_ARTIFACT_NAME" ] && [ -f arm64/artifact-purl.txt ]; then
  if [ -f arm64/artifact-purl-safe.txt ]; then
    echo "ARM64_API_ARTIFACT_NAME=$(cat arm64/artifact-purl-safe.txt)" >> $GITHUB_ENV
  else
    echo "ARM64_API_ARTIFACT_NAME=$(cat arm64/artifact-purl.txt)" >> $GITHUB_ENV
  fi
  echo "Using artifact name from file: $(cat arm64/artifact-purl.txt)"
else
  echo "ARM64_API_ARTIFACT_NAME=$(echo -n "$DEVGUARD_ARTIFACT_NAME" | jq -s -R -r @uri)" >> $GITHUB_ENV
  echo "Using provided artifact name: $DEVGUARD_ARTIFACT_NAME"
fi`,
      },
      {
        name: "Get and Attest amd64 SBOM",
        uses: "docker://" + ContainerImages.DEVGUARD_SCANNER,
        with: {
          args: `sh -c "
  slug=$(devguard-scanner slug ${inputValues.commit_ref}) &&
  echo 'Fetching SBOM for artifact:' '\${{ env.AMD64_API_ARTIFACT_NAME }}' &&
  devguard-scanner curl '${ inputValues.devguard_api_url }/api/v1/organizations/${ inputValues.devguard_asset_name }/refs/'$slug'/artifacts/\${{ env.AMD64_API_ARTIFACT_NAME }}/sbom.json/' --token='\${{ secrets.devguard-token }}' > /tmp/amd64.sbom.json &&
  echo 'SBOM downloaded to /tmp/amd64.sbom.json' &&
  for TAG in \${{ env.MANIFEST_TAGS }}; do
    echo 'Attesting amd64 SBOM for manifest:' \\"$TAG\\" &&
    devguard-scanner attest -u ${inputValues.registry_user} -r ${inputValues.registry} -p "\${{ env.REGISTRY_PASSWORD }}" /tmp/amd64.sbom.json --predicateType='https://cyclonedx.org/bom' \\"$TAG\\" --token='\${{ secrets.devguard-token }}' --offline
  done
"`,
        },
        env: {
          AMD64_API_ARTIFACT_NAME: "${{ env.AMD64_API_ARTIFACT_NAME }}",
          MANIFEST_TAGS: "${{ env.MANIFEST_TAGS }}",
        } as Record<string, string>,
      },
      {
        name: "Get and Attest amd64 VeX",
        uses: "docker://" + ContainerImages.DEVGUARD_SCANNER,
        with: {
          args: `sh -c "
  slug=$(devguard-scanner slug ${inputValues.commit_ref}) &&
  echo 'Fetching VeX for artifact:' '\${{ env.AMD64_API_ARTIFACT_NAME }}' &&
  devguard-scanner curl '${ inputValues.devguard_api_url }/api/v1/organizations/${ inputValues.devguard_asset_name }/refs/'$slug'/artifacts/\${{ env.AMD64_API_ARTIFACT_NAME }}/vex.json/' --token='\${{ secrets.devguard-token }}' > /tmp/amd64.vex.json &&
  echo 'VeX downloaded to /tmp/amd64.vex.json' &&
  for TAG in \${{ env.MANIFEST_TAGS }}; do
    echo 'Attesting amd64 VeX for manifest:' \\"$TAG\\" &&
    devguard-scanner attest -u ${inputValues.registry_user} -r ${inputValues.registry} -p "\${{ env.REGISTRY_PASSWORD }}" /tmp/amd64.vex.json \\"$TAG\\" --token='\${{ secrets.devguard-token }}' --predicateType='https://cyclonedx.org/vex' --offline
  done
"`,
        },
        env: {
          AMD64_API_ARTIFACT_NAME: "${{ env.AMD64_API_ARTIFACT_NAME }}",
          MANIFEST_TAGS: "${{ env.MANIFEST_TAGS }}",
        } as Record<string, string>,
      },
      {
        name: "Get and Attest arm64 SBOM",
        uses: "docker://" + ContainerImages.DEVGUARD_SCANNER,
        with: {
          args: `sh -c "
  slug=$(devguard-scanner slug ${inputValues.commit_ref}) &&
  echo 'Fetching SBOM for artifact:' '\${{ env.ARM64_API_ARTIFACT_NAME }}' &&
  devguard-scanner curl '${ inputValues.devguard_api_url }/api/v1/organizations/${ inputValues.devguard_asset_name }/refs/'$slug'/artifacts/\${{ env.ARM64_API_ARTIFACT_NAME }}/sbom.json/' --token='\${{ secrets.devguard-token }}' > /tmp/arm64.sbom.json &&
  echo 'SBOM downloaded to /tmp/arm64.sbom.json' &&
  for TAG in \${{ env.MANIFEST_TAGS }}; do
    echo 'Attesting arm64 SBOM for manifest:' \\"$TAG\\" &&
    devguard-scanner attest -u ${inputValues.registry_user} -r ${inputValues.registry} -p "\${{ env.REGISTRY_PASSWORD }}" /tmp/arm64.sbom.json --predicateType='https://cyclonedx.org/bom' \\"$TAG\\" --token='\${{ secrets.devguard-token }}' --offline
  done
"`,
        },
        env: {
          ARM64_API_ARTIFACT_NAME: "${{ env.ARM64_API_ARTIFACT_NAME }}",
          MANIFEST_TAGS: "${{ env.MANIFEST_TAGS }}",
        } as Record<string, string>,
      },
      {
        name: "Get and Attest arm64 VeX",
        uses: "docker://" + ContainerImages.DEVGUARD_SCANNER,
        with: {
          args: `sh -c "
  slug=$(devguard-scanner slug ${inputValues.commit_ref}) &&
  echo 'Fetching VeX for artifact:' '\${{ env.ARM64_API_ARTIFACT_NAME }}' &&
  devguard-scanner curl '${ inputValues.devguard_api_url }/api/v1/organizations/${ inputValues.devguard_asset_name }/refs/'$slug'/artifacts/\${{ env.ARM64_API_ARTIFACT_NAME }}/vex.json/' --token='\${{ secrets.devguard-token }}' > /tmp/arm64.vex.json &&
  echo 'VeX downloaded to /tmp/arm64.vex.json' &&
  for TAG in \${{ env.MANIFEST_TAGS }}; do
    echo 'Attesting arm64 VeX for manifest:' \\"$TAG\\" &&
    devguard-scanner attest -u ${inputValues.registry_user} -r ${inputValues.registry} -p "\${{ env.REGISTRY_PASSWORD }}" /tmp/arm64.vex.json \\"$TAG\\" --token='\${{ secrets.devguard-token }}' --predicateType='https://cyclonedx.org/vex' --offline
  done
"`,
        },
        env: {
          ARM64_API_ARTIFACT_NAME: "${{ env.ARM64_API_ARTIFACT_NAME }}",
          MANIFEST_TAGS: "${{ env.MANIFEST_TAGS }}",
        } as Record<string, string>,
      },
      {
        name: "Get and Attest SAST-Results",
        uses: "docker://" + ContainerImages.DEVGUARD_SCANNER,
        with: {
          args: `sh -c "
  slug=$(devguard-scanner slug ${inputValues.commit_ref}) &&
  echo 'Fetching SAST results' &&
  devguard-scanner curl '${ inputValues.devguard_api_url }/api/v1/organizations/${ inputValues.devguard_asset_name }/refs/'$slug'/sarif.json' --token='\${{ secrets.devguard-token }}' > /tmp/sarif.json &&
  echo 'SAST results downloaded to /tmp/sarif.json' &&
  for TAG in \${{ env.MANIFEST_TAGS }}; do
    echo 'Attesting SAST results for manifest:' \\"$TAG\\" &&
    devguard-scanner attest -u ${inputValues.registry_user} -r ${inputValues.registry} -p "\${{ env.REGISTRY_PASSWORD }}" /tmp/sarif.json \\"$TAG\\" --predicateType='https://www.schemastore.org/schemas/json/sarif-2.1.0.json' --token='\${{ secrets.devguard-token }}' --offline
  done
"`,
        },
        env: {
          MANIFEST_TAGS: "${{ env.MANIFEST_TAGS }}",
        } as Record<string, string>,
      },
      {
        name: "Attest amd64 build provenance",
        uses: "docker://" + ContainerImages.DEVGUARD_SCANNER,
        "continue-on-error": true,
        with: {
          args: `sh -c "
  if [ -f amd64.provenance.json ]; then
    for TAG in \${{ env.MANIFEST_TAGS }}; do
      echo 'Attesting amd64 provenance for manifest:' \\"$TAG\\" &&
      devguard-scanner attest -u ${inputValues.registry_user} -r ${inputValues.registry} -p "\${{ env.REGISTRY_PASSWORD }}" amd64.provenance.json \\"$TAG\\" --predicateType='https://slsa.dev/provenance/v1' --token='\${{ secrets.devguard-token }}' --offline
    done
  fi
"`,
        },
        env: {
          MANIFEST_TAGS: "${{ env.MANIFEST_TAGS }}",
        } as Record<string, string>,
      },
      {
        name: "Attest arm64 build provenance",
        uses: "docker://" + ContainerImages.DEVGUARD_SCANNER,
        "continue-on-error": true,
        with: {
          args: `sh -c "
  if [ -f arm64.provenance.json ]; then
    for TAG in \${{ env.MANIFEST_TAGS }}; do
      echo 'Attesting arm64 provenance for manifest:' \\"$TAG\\" &&
      devguard-scanner attest -u ${inputValues.registry_user} -r ${inputValues.registry} -p "\${{ env.REGISTRY_PASSWORD }}" arm64.provenance.json \\"$TAG\\" --predicateType='https://slsa.dev/provenance/v1' --token='\${{ secrets.devguard-token }}' --offline
    done
  fi
"`,
        },
        env: {
          MANIFEST_TAGS: "${{ env.MANIFEST_TAGS }}",
        } as Record<string, string>,
      },
    ],
  },
}));

export const CreateManifestMultiArchTemplate = defineJobGitLab(CreateManifestMultiArchJobInputs, (inputValues) => ({
  name: `devguard:create_manifest_multi_arch${inputValues.job_suffix}`,
  job: {
    stage: inputValues.stage,
    image: ContainerImages.DOCKER,
    needs: inputValues.needs,
    dependencies: inputValues.dependencies,
    before_script: [
      `apk add --no-cache bash`,
      `mkdir -p ~/.docker`,
      `echo '{"experimental":"enabled"}' > ~/.docker/config.json`,
    ],
    script: [
      `docker login $CI_REGISTRY -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD

AMD64_TAG=$(grep '^IMAGE_TAG=' ${inputValues.artifacts_subdirectory}/generate_tag_${inputValues.upstream_version}_amd64.env | cut -d'=' -f2)
ARM64_TAG=$(grep '^IMAGE_TAG=' ${inputValues.artifacts_subdirectory}/generate_tag_${inputValues.upstream_version}_arm64.env | cut -d'=' -f2)
AMD64_ARTIFACT_NAME=$(grep '^ARTIFACT_NAME=' ${inputValues.artifacts_subdirectory}/generate_tag_${inputValues.upstream_version}_amd64.env | cut -d'=' -f2-)
ARM64_ARTIFACT_NAME=$(grep '^ARTIFACT_NAME=' ${inputValues.artifacts_subdirectory}/generate_tag_${inputValues.upstream_version}_arm64.env | cut -d'=' -f2-)

if [ -z "$AMD64_TAG" ] || [ -z "$ARM64_TAG" ]; then
  echo "ERROR: Could not read arch-specific IMAGE_TAG from generate_tag env files"
  exit 1
fi

echo "amd64: $AMD64_TAG"
echo "arm64: $ARM64_TAG"

# Strip the -amd64 suffix to get the base tag
BASE_TAG="\${AMD64_TAG%-amd64}"

echo "Creating manifest: $BASE_TAG -> $AMD64_TAG + $ARM64_TAG"
docker manifest create "$BASE_TAG" "$AMD64_TAG" "$ARM64_TAG"
docker manifest push "$BASE_TAG"

echo "MANIFEST_IMAGE_TAG=$BASE_TAG" > manifest_image_tag.env
echo "AMD64_ARTIFACT_NAME=$AMD64_ARTIFACT_NAME" >> manifest_image_tag.env
echo "ARM64_ARTIFACT_NAME=$ARM64_ARTIFACT_NAME" >> manifest_image_tag.env

if [ "${inputValues.create_root_manifest}" = "true" ]; then
  ROOT_TAG=$(echo "$BASE_TAG" | sed "s/-\${CI_COMMIT_REF_NAME}//")
  if [ "$ROOT_TAG" != "$BASE_TAG" ]; then
    echo "Creating root manifest: $ROOT_TAG"
    docker manifest create "$ROOT_TAG" "$AMD64_TAG" "$ARM64_TAG"
    docker manifest push "$ROOT_TAG"
    echo "MANIFEST_WITHOUT_REF_TAG=$ROOT_TAG" >> manifest_image_tag.env
  fi
fi`,
    ],
    artifacts: {
      reports: {
        dotenv: `manifest_image_tag.env`,
      },
      expire_in: `1 week`,
    },
  },
}));

export const SignManifestMultiArchJobInputs = defineInputsGitLab({
  stage: {
    ...Inputs.stage,
    default: "attestation" as const,
  },
  needs: Inputs.needs,
  dependencies: Inputs.dependencies,
  job_suffix: Inputs.job_suffix,
  pull_policy: Inputs.pull_policy,
  devguard_token: Inputs.devguard_token,
  ...CreateManifestMultiArchSigningInputs,
});

export const SignManifestMultiArchTemplate = defineJobGitLab(SignManifestMultiArchJobInputs, (inputValues) => ({
  name: `devguard:sign_manifest_multi_arch${inputValues.job_suffix}`,
  job: {
    stage: inputValues.stage,
    needs: inputValues.needs,
    dependencies: inputValues.dependencies,
    image: {
      name: ContainerImages.DEVGUARD_SCANNER,
      pull_policy: inputValues.pull_policy,
      entrypoint: [""],
    },
    script: [
      `devguard-scanner login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY

MANIFEST_TAGS="$MANIFEST_IMAGE_TAG"
if [ -n "$MANIFEST_WITHOUT_REF_TAG" ]; then
  MANIFEST_TAGS="$MANIFEST_TAGS $MANIFEST_WITHOUT_REF_TAG"
fi

SLUG=$(devguard-scanner slug "${inputValues.commit_ref}")

AMD64_API_ARTIFACT_NAME=$(python3 -c "from urllib.parse import quote; print(quote('$AMD64_ARTIFACT_NAME', safe=''))")
ARM64_API_ARTIFACT_NAME=$(python3 -c "from urllib.parse import quote; print(quote('$ARM64_ARTIFACT_NAME', safe=''))")

devguard-scanner curl "${inputValues.devguard_api_url}/api/v1/organizations/${inputValues.devguard_asset_name}/refs/$SLUG/artifacts/$AMD64_API_ARTIFACT_NAME/sbom.json/" --token="${inputValues.devguard_token}" > /tmp/amd64.sbom.json
devguard-scanner curl "${inputValues.devguard_api_url}/api/v1/organizations/${inputValues.devguard_asset_name}/refs/$SLUG/artifacts/$AMD64_API_ARTIFACT_NAME/vex.json/" --token="${inputValues.devguard_token}" > /tmp/amd64.vex.json
devguard-scanner curl "${inputValues.devguard_api_url}/api/v1/organizations/${inputValues.devguard_asset_name}/refs/$SLUG/artifacts/$ARM64_API_ARTIFACT_NAME/sbom.json/" --token="${inputValues.devguard_token}" > /tmp/arm64.sbom.json
devguard-scanner curl "${inputValues.devguard_api_url}/api/v1/organizations/${inputValues.devguard_asset_name}/refs/$SLUG/artifacts/$ARM64_API_ARTIFACT_NAME/vex.json/" --token="${inputValues.devguard_token}" > /tmp/arm64.vex.json
devguard-scanner curl "${inputValues.devguard_api_url}/api/v1/organizations/${inputValues.devguard_asset_name}/refs/$SLUG/sarif.json" --token="${inputValues.devguard_token}" > /tmp/sarif.json

ATTESTATIONS="/tmp/amd64.sbom.json|https://cyclonedx.org/bom
/tmp/amd64.vex.json|https://cyclonedx.org/vex
/tmp/arm64.sbom.json|https://cyclonedx.org/bom
/tmp/arm64.vex.json|https://cyclonedx.org/vex
/tmp/sarif.json|https://www.schemastore.org/schemas/json/sarif-2.1.0.json"
if [ -f build-amd64.provenance.json ]; then
  ATTESTATIONS="$ATTESTATIONS
build-amd64.provenance.json|https://slsa.dev/provenance/v1"
fi
if [ -f build-arm64.provenance.json ]; then
  ATTESTATIONS="$ATTESTATIONS
build-arm64.provenance.json|https://slsa.dev/provenance/v1"
fi

for TAG in $MANIFEST_TAGS; do
  echo "Signing manifest: $TAG"
  devguard-scanner sign --token="${inputValues.devguard_token}" "$TAG" --offline

  echo "$ATTESTATIONS" | while IFS='|' read -r FILE PREDICATE_TYPE; do
    [ -z "$FILE" ] && continue
    echo "Attesting $FILE ($PREDICATE_TYPE) -> $TAG"
    devguard-scanner attest "$FILE" --predicateType="$PREDICATE_TYPE" "$TAG" --token="${inputValues.devguard_token}" --offline
  done
done`,
    ],
  },
}));
