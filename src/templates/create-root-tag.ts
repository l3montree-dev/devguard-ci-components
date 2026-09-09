import { defineInputsGitLab, defineJobGitLab } from "../lib/JobBuilderGitLab";
import { defineInputsGitHub, defineJobGitHub } from "../lib/JobBuilderGitHub";
import { InputGroups, Inputs, Secrets } from "./inputs";
import { ContainerImages } from "../container-image-versions";
import { ACTIONS_DOWNLOAD_ARTIFACT, IMJASONH_SETUP_CRANE } from "../actions-versions";
import { GitHubReusableSteps } from "../github-resusable-steps";

// Single-arch counterpart of create-manifest-multi-arch: instead of combining
// two arch-specific images into a manifest list, it just re-tags the already
// pushed image under a floating tag with the branch/tag ref stripped out
// (e.g. "16.15-v1.13.5" -> "16.15"), then signs that floating tag too. This only happens if the ref suffix is actually present in the image tag, otherwise it does nothing.

export const CreateRootTagJobInputs = defineInputsGitLab({
  stage: {
    ...Inputs.stage,
    default: "attestation" as const,
  },
  needs: Inputs.needs,
  dependencies: Inputs.dependencies,
  job_suffix: Inputs.job_suffix,
  create_root_manifest: Inputs.create_root_manifest,
  image_tag: Inputs.image_tag,
  devguard_token: Inputs.devguard_token,
  devguard_api_url: Inputs.devguard_api_url,
  devguard_asset_name: Inputs.devguard_asset_name,
  devguard_artifact_name: Inputs.devguard_artifact_name,
  commit_ref: Inputs.commit_ref,
  is_tag: Inputs.is_tag,
  ...InputGroups.registry,
  registry_password: Inputs.registry_password,
});

export const CreateRootTagJobInputsGitHub = defineInputsGitHub({
  image_suffix: Inputs.image_suffix,
  create_root_manifest: Inputs.create_root_manifest,
  devguard_api_url: Inputs.devguard_api_url,
  devguard_asset_name: Inputs.devguard_asset_name,
  devguard_artifact_name: Inputs.devguard_artifact_name,
  commit_ref: Inputs.commit_ref,
  is_tag: Inputs.is_tag,
  ...InputGroups.registry,
});

export const CreateRootTagTemplateGitHub = defineJobGitHub(CreateRootTagJobInputsGitHub, (inputValues) => ({
  name: "devguard:create-root-tag",
  secrets: {
    "registry-password": Secrets["registry-password"],
    "devguard-token": Secrets["devguard-token"],
  },
  job: {
    "runs-on": "ubuntu-latest",
    if: "inputs.create_root_manifest == 'true' || inputs.create_root_manifest == true",
    permissions: {
      packages: "write",
    },
    steps: [
      GitHubReusableSteps.ResolveRegistryPassword,
      {
        name: "Download image-tag artifact",
        uses: ACTIONS_DOWNLOAD_ARTIFACT,
        with: {
          name: `image-tag${ inputValues.image_suffix }`,
          path: ".",
        },
      },
      {
        name: "Setup crane",
        uses: IMJASONH_SETUP_CRANE,
      },
      {
        name: "Log in to registry",
        run: `crane auth login ${ inputValues.registry } -u ${ inputValues.registry_user } -p "\${{ env.REGISTRY_PASSWORD }}"`,
      },
      {
        name: "Create and sign floating root tag",
        env: {
          DEVGUARD_TOKEN: "${{ secrets.devguard-token }}",
        } as Record<string, string>,
        run: `IMAGE_TAG=$(cat image-tag.txt | tr '[:upper:]' '[:lower:]')
ROOT_TAG=$(echo "$IMAGE_TAG" | sed "s/-\${GITHUB_REF_NAME}//")

if [ "$ROOT_TAG" = "$IMAGE_TAG" ]; then
  echo "No ref suffix found in $IMAGE_TAG; skipping floating root tag"
else
  ROOT_TAG_ONLY="\${ROOT_TAG##*:}"
  echo "Creating floating root tag: $ROOT_TAG_ONLY -> $IMAGE_TAG"
  crane tag "$IMAGE_TAG" "$ROOT_TAG_ONLY"

  echo "Signing floating root tag: $ROOT_TAG"
  docker run --rm ${ ContainerImages.DEVGUARD_SCANNER } devguard-scanner sign -u ${ inputValues.registry_user } -r ${ inputValues.registry } -p "\${{ env.REGISTRY_PASSWORD }}" --token="$DEVGUARD_TOKEN" "$ROOT_TAG" --apiUrl="${ inputValues.devguard_api_url }" --assetName="${ inputValues.devguard_asset_name }"

  echo "ROOT_TAG=$ROOT_TAG" >> $GITHUB_ENV
fi`,
      },
      {
        name: "Download build provenance",
        uses: ACTIONS_DOWNLOAD_ARTIFACT,
        with: {
          name: `build${ inputValues.image_suffix }.provenance.json`,
        },
        "continue-on-error": true,
      },
      {
        name: "Download artifact purl",
        uses: ACTIONS_DOWNLOAD_ARTIFACT,
        with: {
          name: `artifact-purl${ inputValues.image_suffix }`,
          path: ".",
        },
        if: "inputs.devguard_artifact_name == ''",
        "continue-on-error": true,
      },
      {
        name: "Download artifact purl (safe)",
        uses: ACTIONS_DOWNLOAD_ARTIFACT,
        with: {
          name: `artifact-purl-safe${ inputValues.image_suffix }`,
          path: ".",
        },
        if: "inputs.devguard_artifact_name == ''",
        "continue-on-error": true,
      },
      {
        name: "Attest floating root tag",
        if: "env.ROOT_TAG != ''",
        env: {
          DEVGUARD_TOKEN: "${{ secrets.devguard-token }}",
        } as Record<string, string>,
        run: `ARTIFACT_NAME="${ inputValues.devguard_artifact_name }"
if [ -z "$ARTIFACT_NAME" ] && [ -f artifact-purl.txt ]; then
  ARTIFACT_NAME=$(cat artifact-purl.txt)
fi
if [ -f artifact-purl-safe.txt ]; then
  API_ARTIFACT_NAME=$(cat artifact-purl-safe.txt)
else
  API_ARTIFACT_NAME=$(echo -n "$ARTIFACT_NAME" | jq -s -R -r @uri)
fi
echo "Attesting for artifact: $ARTIFACT_NAME"

SLUG=$(docker run --rm ${ ContainerImages.DEVGUARD_SCANNER } devguard-scanner slug "${ inputValues.commit_ref }")

docker run --rm ${ ContainerImages.DEVGUARD_SCANNER } devguard-scanner curl "${ inputValues.devguard_api_url }/api/v1/organizations/${ inputValues.devguard_asset_name }/refs/$SLUG/artifacts/$API_ARTIFACT_NAME/sbom.json/" --token="$DEVGUARD_TOKEN" > sbom.json
docker run --rm ${ ContainerImages.DEVGUARD_SCANNER } devguard-scanner curl "${ inputValues.devguard_api_url }/api/v1/organizations/${ inputValues.devguard_asset_name }/refs/$SLUG/artifacts/$API_ARTIFACT_NAME/vex.json/" --token="$DEVGUARD_TOKEN" > vex.json
docker run --rm ${ ContainerImages.DEVGUARD_SCANNER } devguard-scanner curl "${ inputValues.devguard_api_url }/api/v1/organizations/${ inputValues.devguard_asset_name }/refs/$SLUG/sarif.json" --token="$DEVGUARD_TOKEN" > sarif.json

ATTESTATIONS=("sbom.json:https://cyclonedx.org/bom" "vex.json:https://cyclonedx.org/vex" "sarif.json:https://www.schemastore.org/schemas/json/sarif-2.1.0.json")
[ -f build.provenance.json ] && ATTESTATIONS+=("build.provenance.json:https://slsa.dev/provenance/v1")

for ENTRY in "\${ATTESTATIONS[@]}"; do
  FILE="\${ENTRY%%:*}"
  PREDICATE_TYPE="\${ENTRY#*:}"
  echo "Attesting $FILE ($PREDICATE_TYPE) -> $ROOT_TAG"
  docker run --rm -v "$PWD:/workspace" -w /workspace ${ ContainerImages.DEVGUARD_SCANNER } devguard-scanner attest -u ${ inputValues.registry_user } -r ${ inputValues.registry } -p "\${{ env.REGISTRY_PASSWORD }}" "$FILE" --predicateType="$PREDICATE_TYPE" "$ROOT_TAG" --token="$DEVGUARD_TOKEN" --apiUrl="${ inputValues.devguard_api_url }" --assetName="${ inputValues.devguard_asset_name }" --ref="${ inputValues.commit_ref }" --isTag="${ inputValues.is_tag }" --artifactName="$ARTIFACT_NAME"
done`,
      },
    ],
  },
}));

export const CreateRootTagTemplate = defineJobGitLab(CreateRootTagJobInputs, (inputValues) => ({
  name: `devguard:create_root_tag${inputValues.job_suffix}`,
  job: {
    stage: inputValues.stage,
    image: {
      name: ContainerImages.DEVGUARD_SCANNER,
      entrypoint: [""],
    },
    needs: inputValues.needs,
    dependencies: inputValues.dependencies,
    script: [
      // The create_root_manifest default is a shell command substitution, so it can only be
      // evaluated in a script - a rules:if: on it would be invalid expression syntax.
      `if [ "${inputValues.create_root_manifest}" != "true" ]; then
  echo "create_root_manifest is not true; skipping floating root tag"
  exit 0
fi

/crane auth login -u ${inputValues.registry_user} -p ${inputValues.registry_password} ${inputValues.registry}

IMAGE_TAG=$(echo "${inputValues.image_tag}" | tr '[:upper:]' '[:lower:]')
ROOT_TAG=$(echo "$IMAGE_TAG" | sed "s/-\${CI_COMMIT_REF_NAME}//")

if [ "$ROOT_TAG" = "$IMAGE_TAG" ]; then
  echo "No ref suffix found in $IMAGE_TAG; skipping floating root tag"
else
  ROOT_TAG_ONLY="\${ROOT_TAG##*:}"
  echo "Creating floating root tag: $ROOT_TAG_ONLY -> $IMAGE_TAG"
  /crane tag "$IMAGE_TAG" "$ROOT_TAG_ONLY"

  echo "Signing floating root tag: $ROOT_TAG"
  /devguard-scanner sign --token="${inputValues.devguard_token}" --apiUrl="${inputValues.devguard_api_url}" --assetName="${inputValues.devguard_asset_name}" "$ROOT_TAG"

  echo "Attesting floating root tag: $ROOT_TAG"
  SLUG=$(/devguard-scanner slug "${inputValues.commit_ref}")

  /devguard-scanner curl "${inputValues.devguard_api_url}/api/v1/organizations/${inputValues.devguard_asset_name}/refs/$SLUG/artifacts/${inputValues.devguard_artifact_name}/sbom.json/" --token="${inputValues.devguard_token}" > /tmp/sbom.json
  /devguard-scanner curl "${inputValues.devguard_api_url}/api/v1/organizations/${inputValues.devguard_asset_name}/refs/$SLUG/artifacts/${inputValues.devguard_artifact_name}/vex.json/" --token="${inputValues.devguard_token}" > /tmp/vex.json
  /devguard-scanner curl "${inputValues.devguard_api_url}/api/v1/organizations/${inputValues.devguard_asset_name}/refs/$SLUG/sarif.json" --token="${inputValues.devguard_token}" > /tmp/sarif.json

  ATTESTATIONS=("/tmp/sbom.json:https://cyclonedx.org/bom" "/tmp/vex.json:https://cyclonedx.org/vex" "/tmp/sarif.json:https://www.schemastore.org/schemas/json/sarif-2.1.0.json")
  [ -f build.provenance.json ] && ATTESTATIONS+=("build.provenance.json:https://slsa.dev/provenance/v1")

  for ENTRY in "\${ATTESTATIONS[@]}"; do
    FILE="\${ENTRY%%:*}"
    PREDICATE_TYPE="\${ENTRY#*:}"
    echo "Attesting $FILE ($PREDICATE_TYPE) -> $ROOT_TAG"
    /devguard-scanner attest "$FILE" --predicateType="$PREDICATE_TYPE" "$ROOT_TAG" --token="${inputValues.devguard_token}" --apiUrl="${inputValues.devguard_api_url}" --assetName="${inputValues.devguard_asset_name}" --ref="${inputValues.commit_ref}" --isTag="${inputValues.is_tag}" --artifactName="${inputValues.devguard_artifact_name}"
  done
fi`,
    ],
  },
}));
