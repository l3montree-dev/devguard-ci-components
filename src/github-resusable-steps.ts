export class GitHubReusableSteps {
  static CheckoutCode = {
    name: "Checkout code",
    uses: "actions/checkout@v4",
    with: {
      "fetch-depth": 0, // Ensure full git history is available for secret scanning
      "persist-credentials": false, // Avoid exposing GitHub token to scanner if not needed
      submodules: "recursive", // Ensure submodules are checked out
    },
  };

  static checkoutCode(fetchDepth: number | string = 0) {
    return {
      name: "Checkout code",
      uses: "actions/checkout@v4",
      with: {
        "fetch-depth": fetchDepth,
        "persist-credentials": false,
        submodules: "recursive",
      },
    };
  }
}
