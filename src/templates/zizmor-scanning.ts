import { defineInputsGitHub, defineJobGitHub } from "../lib/JobBuilderGitHub";
import { Inputs, Secrets } from "./inputs";
import { ContainerImages } from "../container-image-versions";
import { ACTIONS_CHECKOUT } from "../actions-versions";

const ZizmorScanningConfig = {
  devguard_api_url: Inputs.devguard_api_url,
  devguard_asset_name: Inputs.devguard_asset_name,
  devguard_web_ui: Inputs.devguard_web_ui,

  allow_failure: Inputs.allow_failure,

  default_ref: Inputs.default_ref,
  commit_ref: Inputs.commit_ref,
  is_tag: Inputs.is_tag,
};

export const ZizmorScanningJobInputsGitHub = defineInputsGitHub({
  ...ZizmorScanningConfig,
});

export const ZizmorScanningTemplateGitHub = defineJobGitHub(ZizmorScanningJobInputsGitHub, (inputValues) => ({
  name: "devguard:zizmor-scanning",
  secrets: {
    "devguard-token": Secrets["devguard-token"],
  },
  job: {
    "runs-on": "ubuntu-latest",
    permissions: {
      "security-events": "write",
      contents: "read",
      actions: "read",
    },
    steps: [
      {
        name: "Checkout repository",
        uses: ACTIONS_CHECKOUT,
        with: {
          "persist-credentials": false,
        },
      },
      {
        name: "Install the latest version of uv",
        uses: "astral-sh/setup-uv@08807647e7069bb48b6ef5acd8ec9567f424441b", // v8.1.0
      },
      {
        name: "Run zizmor",
        run: `uvx zizmor --format=sarif .github/workflows/ > zizmor.sarif`,
        env: {
          GH_TOKEN: "${{ github.token }}",
        },
      },
      {
        name: "Upload SARIF to DevGuard",
        uses: "docker://" + ContainerImages.DEVGUARD_SCANNER,
        "continue-on-error": inputValues.allow_failure as boolean,
        with: {
          args: `devguard-scanner sarif zizmor.sarif --assetName="${inputValues.devguard_asset_name}" --apiUrl="${inputValues.devguard_api_url}" --token="\${{ secrets.devguard-token }}" --defaultRef="${inputValues.default_ref}" --ref="${inputValues.commit_ref}" --isTag="${inputValues.is_tag}" --webUI=${inputValues.devguard_web_ui}`,
        },
      },
    ],
  },
}));
