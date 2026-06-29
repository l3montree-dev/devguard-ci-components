import { ACTIONS_CHECKOUT } from "./actions-versions";

export class GitHubReusableSteps {
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
  echo "REGISTRY_PASSWORD=\${{ github.token }}" >> $GITHUB_ENV
fi`,
    env: {
      SECRET_PASSWORD: "${{ secrets.registry-password }}",
    } as Record<string, string>,
  };
}
