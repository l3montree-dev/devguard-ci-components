import {
  ACTIONS_CHECKOUT,
  ACTIONS_DOWNLOAD_ARTIFACT,
  CRANE_VERSION,
  DOCKER_LOGIN_ACTION,
  IMJASONH_SETUP_CRANE,
} from "./actions-versions";
import { assetApiPath } from "./lib/asset-path";

export class GitHubReusableSteps {
  static SetupSubmoduleSsh = {
    name: "Set up SSH for private git submodules",
    env: {
      SUBMODULE_SSH_KEY: "${{ secrets.submodule-ssh-key }}",
    },
    run: `if [ -n "$SUBMODULE_SSH_KEY" ]; then
  mkdir -p ~/.ssh
  echo "$SUBMODULE_SSH_KEY" > ~/.ssh/id_ed25519
  chmod 600 ~/.ssh/id_ed25519
  ssh-keyscan gitlab.com github.com >> ~/.ssh/known_hosts
fi`,
  };

  static SetupCrane = {
    name: "Setup crane",
    uses: IMJASONH_SETUP_CRANE,
    with: {
      version: CRANE_VERSION,
    },
  };

  static CheckoutCode = {
    name: "Checkout code",
    uses: ACTIONS_CHECKOUT,
    with: {
      "fetch-depth": 0, // Ensure full git history is available for secret scanning
      "persist-credentials": false, // Avoid exposing GitHub token to scanner if not needed
      submodules: "recursive", // Ensure submodules are checked out
    },
  };

  // Resolves the registry password from the optional secret, falling back to
  // github.token. Result is stored in ${{ env.REGISTRY_PASSWORD }}.
  static ResolveRegistryPassword = {
    name: "Resolve registry password",
    run: `if [ -n "$SECRET_PASSWORD" ]; then
  echo "REGISTRY_PASSWORD=$SECRET_PASSWORD" >> $GITHUB_ENV
else
  echo "REGISTRY_PASSWORD=$FALLBACK_TOKEN" >> $GITHUB_ENV
fi`,
    env: {
      SECRET_PASSWORD: "${{ secrets.registry-password }}",
      FALLBACK_TOKEN: "${{ github.token }}",
    } as Record<string, string>,
  };

  // Result is stored in ${{ env.DEVGUARD_ASSET_PATH }}.
  static ResolveAssetPath(assetName: string) {
    return {
      name: "Resolve DevGuard asset API path",
      env: {
        DEVGUARD_ASSET_NAME: assetName,
      },
      run: `echo "DEVGUARD_ASSET_PATH=${assetApiPath("$DEVGUARD_ASSET_NAME")}" >> $GITHUB_ENV`,
    };
  }

  static DownloadImageTag(imageSuffix: string) {
    return {
      name: "Download image-tag artifact",
      uses: ACTIONS_DOWNLOAD_ARTIFACT,
      with: {
        name: `image-tag${imageSuffix}`,
        path: ".",
      },
    };
  }

  static DownloadImageDigest(imageSuffix: string, continueOnError = false) {
    return {
      name: "Download image-digest artifact",
      uses: ACTIONS_DOWNLOAD_ARTIFACT,
      with: {
        name: `image-digest${imageSuffix}`,
        path: ".",
      },
      ...(continueOnError ? { "continue-on-error": true } : {}),
    };
  }

  static DockerLogin(registry: string, username: string) {
    return {
      name: "Log in to registry",
      uses: DOCKER_LOGIN_ACTION,
      with: {
        registry,
        username,
        password: "${{ env.REGISTRY_PASSWORD }}",
      },
    };
  }
}
