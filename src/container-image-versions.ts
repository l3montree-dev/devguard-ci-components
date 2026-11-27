export enum ContainerImages {
  KANIKO = "registry.opencode.de/oci-community/images/l3montree/kaniko:v1.29.0-debug@sha256:4e822783b12ae86940a3216e16912472b23513cb7c0224505ab956262e55991d",
  // every crane call runs the crane of this image (or CRANE_FLAKE): crane compresses the layers on push and when
  // computing a tarball digest, and a different crane or Go version compresses differently, which breaks the bitwise
  // identical GitHub and GitLab builds
  DEVGUARD_SCANNER = "ghcr.io/l3montree-dev/devguard/scanner:main",
  GITLAB_RELEASE_CLI = "registry.gitlab.com/gitlab-org/release-cli:latest",
  DOCKER = "api.devguard.org/docker.io/library/docker:28.5.2@sha256:2a232a42256f70d78e3cc5d2b5d6b3276710a0de0596c145f627ecfae90282ac",
}

// for jobs which run in nix instead of docker - the same crane derivation as in ContainerImages.DEVGUARD_SCANNER, so
// both must be pinned to the same devguard release (devguard-maint release ci-components does that)
export const CRANE_FLAKE = "github:l3montree-dev/devguard#crane";
export const DEVGUARD_SCANNER_FLAKE = "github:l3montree-dev/devguard#devguardScanner";
