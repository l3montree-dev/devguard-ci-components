export enum ContainerImages {
  KANIKO = "registry.gitlab.com/l3montree/devguard/osscontainertools-kaniko-crane:kaniko-v1.28.3-devguard-scanner-v1.12.4@sha256:07b0db85f1fe98a8ce05cc1855649d9e758cea3ebb40e98b6282148b48c1a350",
  DEVGUARD_SCANNER = "ghcr.io/l3montree-dev/devguard/scanner:v1.12.5",
  GITLAB_RELEASE_CLI = "registry.gitlab.com/gitlab-org/release-cli:latest",
  DOCKER_KRANE = "registry.opencode.de/plain/oci/valkey/dockerkrane:latest@sha256:4fbbf08bcfa3f9911b093842f730c12902eb009e0716888174cc2cc7ecaaeee6",
  DOCKER = "api.devguard.org/docker.io/library/docker:28.5.2@sha256:2a232a42256f70d78e3cc5d2b5d6b3276710a0de0596c145f627ecfae90282ac",
}
