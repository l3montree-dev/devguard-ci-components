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
  docker run --rm ${ ContainerImages.DEVGUARD_SCANNER } devguard-scanner sign -u ${ inputValues.registry_user } -r ${ inputValues.registry } -p "\${{ env.REGISTRY_PASSWORD }}" --token="$DEVGUARD_TOKEN" "$TAG" --apiUrl="${ inputValues.devguard_api_url }" --assetName="${ inputValues.devguard_asset_name }"
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
        name: "Download amd64 artifact purl",
        uses: ACTIONS_DOWNLOAD_ARTIFACT,
        with: {
          name: `artifact-purl${ inputValues.image_suffix }-amd64`,
          path: "amd64",
        },
        if: "inputs.devguard_artifact_name == ''",
        "continue-on-error": true,
      },
      {
        name: "Download amd64 artifact purl (safe)",
        uses: ACTIONS_DOWNLOAD_ARTIFACT,
        with: {
          name: `artifact-purl-safe${ inputValues.image_suffix }-amd64`,
          path: "amd64",
        },
        if: "inputs.devguard_artifact_name == ''",
        "continue-on-error": true,
      },
      {
        name: "Attest multi-arch manifest(s)",
        env: {
          DEVGUARD_TOKEN: "${{ secrets.devguard-token }}",
        } as Record<string, string>,
        run: `ARTIFACT_NAME="${ inputValues.devguard_artifact_name }"
if [ -z "$ARTIFACT_NAME" ] && [ -f amd64/artifact-purl.txt ]; then
  ARTIFACT_NAME=$(cat amd64/artifact-purl.txt)
fi
if [ -f amd64/artifact-purl-safe.txt ]; then
  API_ARTIFACT_NAME=$(cat amd64/artifact-purl-safe.txt)
else
  API_ARTIFACT_NAME=$(echo -n "$ARTIFACT_NAME" | jq -s -R -r @uri)
fi
echo "Attesting for artifact: $ARTIFACT_NAME"

SLUG=$(docker run --rm ${ ContainerImages.DEVGUARD_SCANNER } devguard-scanner slug "${ inputValues.commit_ref }")

docker run --rm ${ ContainerImages.DEVGUARD_SCANNER } devguard-scanner curl "${ inputValues.devguard_api_url }/api/v1/organizations/${ inputValues.devguard_asset_name }/refs/$SLUG/artifacts/$API_ARTIFACT_NAME/sbom.json/" --token="$DEVGUARD_TOKEN" > /tmp/sbom.json
docker run --rm ${ ContainerImages.DEVGUARD_SCANNER } devguard-scanner curl "${ inputValues.devguard_api_url }/api/v1/organizations/${ inputValues.devguard_asset_name }/refs/$SLUG/artifacts/$API_ARTIFACT_NAME/vex.json/" --token="$DEVGUARD_TOKEN" > /tmp/vex.json
docker run --rm ${ ContainerImages.DEVGUARD_SCANNER } devguard-scanner curl "${ inputValues.devguard_api_url }/api/v1/organizations/${ inputValues.devguard_asset_name }/refs/$SLUG/sarif.json" --token="$DEVGUARD_TOKEN" > /tmp/sarif.json

ATTESTATIONS=("/tmp/sbom.json:https://cyclonedx.org/bom" "/tmp/vex.json:https://cyclonedx.org/vex" "/tmp/sarif.json:https://www.schemastore.org/schemas/json/sarif-2.1.0.json")
[ -f amd64.provenance.json ] && ATTESTATIONS+=("amd64.provenance.json:https://slsa.dev/provenance/v1")
[ -f arm64.provenance.json ] && ATTESTATIONS+=("arm64.provenance.json:https://slsa.dev/provenance/v1")

for TAG in $MANIFEST_TAGS; do
  for ENTRY in "\${ATTESTATIONS[@]}"; do
    FILE="\${ENTRY%%:*}"
    PREDICATE_TYPE="\${ENTRY#*:}"
    echo "Attesting $FILE ($PREDICATE_TYPE) -> $TAG"
    docker run --rm -v "$PWD:/workspace" -w /workspace ${ ContainerImages.DEVGUARD_SCANNER } devguard-scanner attest -u ${ inputValues.registry_user } -r ${ inputValues.registry } -p "\${{ env.REGISTRY_PASSWORD }}" "$FILE" --predicateType="$PREDICATE_TYPE" "$TAG" --token="$DEVGUARD_TOKEN" --apiUrl="${ inputValues.devguard_api_url }" --assetName="${ inputValues.devguard_asset_name }" --ref="${ inputValues.commit_ref }" --isTag="${ inputValues.is_tag }" --artifactName="$ARTIFACT_NAME"
  done
done`,
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
MANIFEST_TAGS="$BASE_TAG"

if [ "${inputValues.create_root_manifest}" = "true" ]; then
  ROOT_TAG=$(echo "$BASE_TAG" | sed "s/-\${CI_COMMIT_REF_NAME}//")
  if [ "$ROOT_TAG" != "$BASE_TAG" ]; then
    echo "Creating root manifest: $ROOT_TAG"
    docker manifest create "$ROOT_TAG" "$AMD64_TAG" "$ARM64_TAG"
    docker manifest push "$ROOT_TAG"
    echo "MANIFEST_WITHOUT_REF_TAG=$ROOT_TAG" >> manifest_image_tag.env
    MANIFEST_TAGS="$MANIFEST_TAGS $ROOT_TAG"
  fi
fi

for TAG in $MANIFEST_TAGS; do
  echo "Signing manifest: $TAG"
  docker run --rm ${ContainerImages.DEVGUARD_SCANNER} devguard-scanner sign -u $CI_REGISTRY_USER -r $CI_REGISTRY -p "$CI_REGISTRY_PASSWORD" --token="${inputValues.devguard_token}" "$TAG" --apiUrl="${inputValues.devguard_api_url}" --assetName="${inputValues.devguard_asset_name}"
done`,
    ],
    artifacts: {
      reports: {
        dotenv: `manifest_image_tag.env`,
      },
      expire_in: `1 week`,
    },
  },
}));
