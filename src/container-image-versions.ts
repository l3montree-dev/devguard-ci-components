export enum ContainerImages {
  KANIKO = "registry.gitlab.com/l3montree/devguard/osscontainertools-kaniko-crane:kaniko-v1.28.0-devguard-scanner-v1.11.0@sha256:dfeba5cc570ffda5111af4666c63567209306686ac155e4f1229c76303460bcd",
  DEVGUARD_SCANNER = "ghcr.io/l3montree-dev/devguard/scanner:main",
  GITLAB_RELEASE_CLI = "registry.gitlab.com/gitlab-org/release-cli:latest",
  DOCKER_KRANE = "registry.opencode.de/plain/oci/valkey/dockerkrane:latest@sha256:4fbbf08bcfa3f9911b093842f730c12902eb009e0716888174cc2cc7ecaaeee6",
  DOCKER = "api.devguard.org/docker.io/library/docker:28.5.2@sha256:2a232a42256f70d78e3cc5d2b5d6b3276710a0de0596c145f627ecfae90282ac",
}
