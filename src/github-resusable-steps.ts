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

}
