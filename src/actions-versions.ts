export const ACTIONS_CHECKOUT = "actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0"; // v6.0.3

export const ACTIONS_UPLOAD_ARTIFACT = "actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a"; // v7.0.1

export const ACTIONS_DOWNLOAD_ARTIFACT = "actions/download-artifact@484a0b528fb4d7bd804637ccb632e47a0e638317"; // v8.0.1

export const ACTION_GH_RELEASE = "softprops/action-gh-release@9ed3cf9a6863b31f005d951c8d19de20628cf4eb"; // v3.0.0

export const DOCKER_SETUP_BUILDX_ACTION = "docker/setup-buildx-action@c887d9748da14dcb42b11cf8bcc773b301ea55b5"; // v4.1.0

export const DOCKER_LOGIN_ACTION = "docker/login-action@3864d6aed8ff134b2ed894ce00c87695c709c870"; // v4.2.0

export const CACHIX_INSTALL_NIX_ACTION = "cachix/install-nix-action@8aa03977d8d733052d78f4e008a241fd1dbf36b3"; // v31.10.6

export const IMJASONH_SETUP_CRANE = "imjasonh/setup-crane@cacf28038427f6fb033ef9022f6a2281f23cb3f2"; // v0.6

// The one crane every GitHub job installs (GitHubReusableSteps.SetupCrane) - the official release binary.
// The digest of an image is computed over its compressed layers, and crane compresses uncompressed layers (nix builds)
// itself: how the bytes come out depends on the Go version the crane binary was built with (crane v0.22.1 built with
// go1.26 and with go1.27 produce different ones). The build job computes image-digest.txt with crane and the deploy job
// pushes with crane - only the very same binary makes image-digest.txt the digest of the pushed image.
export const CRANE_VERSION = "v0.22.1";
