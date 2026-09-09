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
        name: "Download artifact purl (can be created by build-image)",
        uses: ACTIONS_DOWNLOAD_ARTIFACT,
        with: {
          name: `artifact-purl${ inputValues.image_suffix }-amd64`,
        },
        if: "inputs.devguard_artifact_name == ''",
      },
      {
        name: "Download safe-artifact (can be created by build-image)",
        uses: ACTIONS_DOWNLOAD_ARTIFACT,
        with: {
          name: `artifact-purl-safe${ inputValues.image_suffix }-amd64`,
        },
        if: "inputs.devguard_artifact_name == ''",
      },
      {
        name: "set artifact-name variable if it is empty",
        env: {
          DEVGUARD_ARTIFACT_NAME: `${ inputValues.devguard_artifact_name }`,
        },
        run: `if [ -z "$DEVGUARD_ARTIFACT_NAME" ] && [ -f artifact-purl.txt ]; then
  echo "ARTIFACT_NAME=$(cat artifact-purl.txt)" >> $GITHUB_ENV
  echo "Using artifact name from file: $ARTIFACT_NAME"
  if [ -f artifact-purl-safe.txt ]; then
    echo "API_ARTIFACT_NAME=$(cat artifact-purl-safe.txt)" >> $GITHUB_ENV
  else
    echo "API_ARTIFACT_NAME=$(cat artifact-purl.txt)" >> $GITHUB_ENV
  fi
else
  echo "ARTIFACT_NAME=$DEVGUARD_ARTIFACT_NAME" >> $GITHUB_ENV
  echo "API_ARTIFACT_NAME=$(echo -n "$DEVGUARD_ARTIFACT_NAME" | jq -s -R -r @uri)" >> $GITHUB_ENV
  echo "Using provided artifact name: $DEVGUARD_ARTIFACT_NAME"
fi`,
      },
      {
        name: "Get and Attest SBOM",
        uses: "docker://" + ContainerImages.DEVGUARD_SCANNER,
        with: {
          args: `sh -c "
  slug=$(devguard-scanner slug ${inputValues.commit_ref}) &&
  echo 'Fetching SBOM for artifact:' '\${{ env.API_ARTIFACT_NAME }}' &&
  devguard-scanner curl '${ inputValues.devguard_api_url }/api/v1/organizations/${ inputValues.devguard_asset_name }/refs/'$slug'/artifacts/\${{ env.API_ARTIFACT_NAME }}/sbom.json/' --token='\${{ secrets.devguard-token }}' > /tmp/sbom.json &&
  echo 'SBOM downloaded to /tmp/sbom.json' &&
  for TAG in \${{ env.MANIFEST_TAGS }}; do
    echo 'Attesting SBOM for manifest:' \\"$TAG\\" &&
    devguard-scanner attest -u ${inputValues.registry_user} -r ${inputValues.registry} -p "\${{ env.REGISTRY_PASSWORD }}" /tmp/sbom.json --predicateType='https://cyclonedx.org/bom' \\"$TAG\\" --token='\${{ secrets.devguard-token }}' --apiUrl=${ inputValues.devguard_api_url } --assetName=${ inputValues.devguard_asset_name } --ref=${inputValues.commit_ref} --isTag=${inputValues.is_tag} --artifactName="$ARTIFACT_NAME"
  done
"`,
        },
        env: {
          API_ARTIFACT_NAME: "${{ env.API_ARTIFACT_NAME }}",
          ARTIFACT_NAME: "${{ env.ARTIFACT_NAME }}",
          MANIFEST_TAGS: "${{ env.MANIFEST_TAGS }}",
        } as Record<string, string>,
      },
      {
        name: "Get and Attest VeX",
        uses: "docker://" + ContainerImages.DEVGUARD_SCANNER,
        with: {
          args: `sh -c "
  slug=$(devguard-scanner slug ${inputValues.commit_ref}) &&
  echo 'Fetching VeX for artifact:' '\${{ env.API_ARTIFACT_NAME }}' &&
  devguard-scanner curl '${ inputValues.devguard_api_url }/api/v1/organizations/${ inputValues.devguard_asset_name }/refs/'$slug'/artifacts/\${{ env.API_ARTIFACT_NAME }}/vex.json/' --token='\${{ secrets.devguard-token }}' > /tmp/vex.json &&
  echo 'VeX downloaded to /tmp/vex.json' &&
  for TAG in \${{ env.MANIFEST_TAGS }}; do
    echo 'Attesting VeX for manifest:' \\"$TAG\\" &&
    devguard-scanner attest -u ${inputValues.registry_user} -r ${inputValues.registry} -p "\${{ env.REGISTRY_PASSWORD }}" /tmp/vex.json \\"$TAG\\" --token='\${{ secrets.devguard-token }}' --predicateType='https://cyclonedx.org/vex' --apiUrl=${ inputValues.devguard_api_url } --assetName=${ inputValues.devguard_asset_name } --ref=${inputValues.commit_ref} --isTag=${inputValues.is_tag} --artifactName="$ARTIFACT_NAME"
  done
"`,
        },
        env: {
          API_ARTIFACT_NAME: "${{ env.API_ARTIFACT_NAME }}",
          ARTIFACT_NAME: "${{ env.ARTIFACT_NAME }}",
          MANIFEST_TAGS: "${{ env.MANIFEST_TAGS }}",
        } as Record<string, string>,
      },
      {
        name: "Get and Attest SAST-Results",
        uses: "docker://" + ContainerImages.DEVGUARD_SCANNER,
        with: {
          args: `sh -c "
  slug=$(devguard-scanner slug ${inputValues.commit_ref}) &&
  echo 'Fetching SAST results for artifact:' '\${{ env.ARTIFACT_NAME }}' &&
  devguard-scanner curl '${ inputValues.devguard_api_url }/api/v1/organizations/${ inputValues.devguard_asset_name }/refs/'$slug'/sarif.json' --token='\${{ secrets.devguard-token }}' > /tmp/sarif.json &&
  echo 'SAST results downloaded to /tmp/sarif.json' &&
  for TAG in \${{ env.MANIFEST_TAGS }}; do
    echo 'Attesting SAST results for manifest:' \\"$TAG\\" &&
    devguard-scanner attest -u ${inputValues.registry_user} -r ${inputValues.registry} -p "\${{ env.REGISTRY_PASSWORD }}" /tmp/sarif.json \\"$TAG\\" --predicateType='https://www.schemastore.org/schemas/json/sarif-2.1.0.json' --token='\${{ secrets.devguard-token }}' --apiUrl=${ inputValues.devguard_api_url } --assetName=${ inputValues.devguard_asset_name } --ref=${inputValues.commit_ref} --isTag=${inputValues.is_tag} --artifactName="$ARTIFACT_NAME"
  done
"`,
        },
        env: {
          ARTIFACT_NAME: "${{ env.ARTIFACT_NAME }}",
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
      devguard-scanner attest -u ${inputValues.registry_user} -r ${inputValues.registry} -p "\${{ env.REGISTRY_PASSWORD }}" amd64.provenance.json \\"$TAG\\" --predicateType='https://slsa.dev/provenance/v1' --token='\${{ secrets.devguard-token }}' --apiUrl=${ inputValues.devguard_api_url } --assetName=${ inputValues.devguard_asset_name } --ref=${inputValues.commit_ref} --isTag=${inputValues.is_tag} --artifactName="$ARTIFACT_NAME"
    done
  fi
"`,
        },
        env: {
          ARTIFACT_NAME: "${{ env.ARTIFACT_NAME }}",
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
      devguard-scanner attest -u ${inputValues.registry_user} -r ${inputValues.registry} -p "\${{ env.REGISTRY_PASSWORD }}" arm64.provenance.json \\"$TAG\\" --predicateType='https://slsa.dev/provenance/v1' --token='\${{ secrets.devguard-token }}' --apiUrl=${ inputValues.devguard_api_url } --assetName=${ inputValues.devguard_asset_name } --ref=${inputValues.commit_ref} --isTag=${inputValues.is_tag} --artifactName="$ARTIFACT_NAME"
    done
  fi
"`,
        },
        env: {
          ARTIFACT_NAME: "${{ env.ARTIFACT_NAME }}",
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
