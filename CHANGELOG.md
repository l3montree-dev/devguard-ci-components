# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed

- **Jobs composed after `generate-tag` could read the wrong artifact name, breaking sbom/vex download URLs and attestation API calls with a 404.** `generate-tag` resolves the artifact name into the `$ARTIFACT_NAME` dotenv variable at runtime (used whenever `devguard_artifact_name` is left empty so the scanner derives it from the built image)
- `attest` jobs across all orchestration templates declared no `dependencies`, relying on GitLab's implicit "download artifacts from every `needs` job" behavior.

## [v1.14.0] — 2026-09-17

### Changed

- `create-root-tag` now invokes `crane` via `PATH` rather than the absolute path `/crane`, matching how it's installed in the `devguard-scanner:main` image

---

## [v1.13.2] — 2026-09-11

### Added

- **Signing and attestation of multi-arch manifests.** The manifest list produced by `create-manifest-multi-arch` was pushed but carried no attestations of its own — only the per-architecture images did, so anything resolving the manifest tag found nothing describing its contents. A new `sign-manifest-multi-arch` component signs the manifest and the root manifest tag and attaches both architectures' SBOM and VeX documents, the SARIF results, and both architectures' SLSA build provenance. The GitHub `create-manifest-multi-arch` workflow does the same inline
- **Floating root tags for single-arch pipelines**, in the GitLab `full`, `container-lifecycle`, and `container-lifecycle-with-base-image-inspection` templates and the GitHub `container-lifecycle` and `full` workflows. After the image is built and pushed, the ref suffix is stripped from its tag (e.g. `16.15-v1.13.5` → `16.15`), the image is re-tagged under that floating tag, and that tag is signed and attested with the artifact's SBOM, VeX, SARIF, and SLSA provenance. Skipped when the tag carries no ref suffix
- `provenance_file` input on the Nix build job, controlling the filename its SLSA build provenance is published under

Manifest and root tags are signed and attested with `--offline`, so **devguard-scanner ≥ v1.13.7 is required**. Neither tag is an artifact DevGuard knows about — only the per-architecture images are — so these attestations are attached to the image in the registry without being written to the backend.

### Fixed

- **The per-architecture `attest` jobs in `build-nix-multiarch` could attest the other architecture's SLSA build provenance.** Both build jobs published their provenance under the same name, `build.provenance.json`, and the attest jobs declare no `dependencies`, so GitLab handed each of them both files and one silently overwrote the other. Each build job now publishes an architecture-specific name (`build-amd64.provenance.json`, `build-arm64.provenance.json`)
- **GitHub attestation failed for images hosted outside ghcr.io.** The SARIF and build provenance attestation steps authenticated against a hardcoded `ghcr.io` using `GITHUB_TOKEN` rather than the `registry` input and the resolved registry password

### Changed

- In the child-pipeline variant of `build-nix-multiarch`, the manifest is no longer signed through a separately included `sign-oci-image.yml` — the manifest job handles signing itself

---

## [v1.13.1] — 2026-09-08

### Added

- `extra_args` input for container scanning, allowing additional arguments to be passed to the DevGuard scanner across container lifecycle and scanning templates
- Support for passing an upstream version to `full-nix`, `full`, and container lifecycle templates

### Fixed

- `generate_tag` produced artifact name not respected in the container lifecycle with base image inspection template
- `discover_baseimage_attestations`, `sbom_upload`, and `vex_upload` jobs in the container lifecycle with base image inspection template now genuinely succeed when no base image attestations are found (`devguard-scanner discover-baseimage-attestations` exits non-zero in that case), instead of always being marked `allow_failure: true` to mask the failure ([devguard#2667](https://github.com/l3montree-dev/devguard/issues/2667))

---

## [v1.13.0] — 2026-08-24

Version bump to stay in sync with the DevGuard [Versioning Policy](https://github.com/l3montree-dev/devguard/blob/main/VERSIONING.md)

---

## [v1.12.4] — 2026-08-20

### Changed

- Marked the `push_oci_image` job as `optional: true` in downstream `needs` across all container lifecycle and attestation templates, so signing and attestation jobs can run even when the push job is skipped

---

## [v1.12.1] — 2026-08-19

### Changed

- Bumped the GitLab kaniko builder image to `kaniko-v1.28.3-devguard-scanner-v1.12.4`

---

## [v1.12.0] — 2026-08-02

### Added

- Support for private submodules via a reusable setup-submodule SSH step, used across all workflow templates that check out the repository

### Changed

- Bumped the GitLab kaniko builder image and included devguard-scanner version
- Switched from GitHub Actions `if:` conditionals to shell-level `if` checks in several build steps
- Reusable steps now read values from environment variables instead of inline `run` statements

---

## [v1.11.0] — 2026-07-24

Version bump to stay in sync with the DevGuard [Versioning Policy](https://github.com/l3montree-dev/devguard/blob/main/VERSIONING.md)

---

## [v1.10.0] — 2026-07-20

Version bump to stay in sync with the DevGuard [Versioning Policy](https://github.com/l3montree-dev/devguard/blob/main/VERSIONING.md)

---

## [v1.9.1] — 2026-07-15

### Fixed

- `attest` jobs in `container-lifecycle`, `container-lifecycle-nix`, `push-and-attest`, and `container-scanning-and-attest` now attest the actual generated image tag (`$IMAGE_TAG`) instead of the static `image` input, which defaulted to `$CI_REGISTRY_IMAGE` (i.e. always the latest image)

---

## [v1.9.0] — 2026-07-14

### Added

- `nix-impure` input and `--impure` flag support for Nix-based builds, allowing values to be read from environment variables

---

## [v1.8.0] — 2026-07-06

First release adhering to the [DevGuard Versioning Policy](https://github.com/l3montree-dev/devguard/blob/main/VERSIONING.md) — major/minor version now synchronized across all DevGuard components. This release also introduces a single TypeScript source that generates both the GitHub Actions and GitLab CI components.

### Added

- `artifacts_subdirectory` input to allow saving scanner output to a subdirectory
- Job prefix input for `build-oci-image` jobs
- Nix-based multi-architecture build support (`build-nix-multiarch.yml`, `build-nix.yml`)
- `container-lifecycle-nix.yml` template for Nix-based container lifecycle pipelines
- `create-manifest-multi-arch.yml` template for multi-architecture manifest creation
- Container scanning integration in Nix multi-arch builds
- `generate-tag` step in Nix build pipeline
- Caching options for `build-nix-multiarch`
- `full-nix` pipeline composition template
- `job_suffix` and `image_suffix` inputs for Nix build jobs
- `pre-cleanup` and `preserve context` flags to kaniko builds to prevent custom image bleeding

### Changed

- devguard-scanner OCI image now provides `jq` and `gettext`, removing the need for a `before_script` section
- Updated scanner and kaniko image versions
- Dependencies in container lifecycle are now forwarded to `build-oci-image` and `push-image-config` jobs

### Fixed

- Attestation file downloads now saved to `/tmp/` to avoid working directory conflicts
- Undefined dependency `create_manifest_multi_arch` in `devguard:sign_oci_image` job
- Duplicate `needs` entries for push and attest jobs
- Missing `job_suffix` in Nix build template
- Incorrect devguard artifact name
- Extracted scanner file path resolution

---

## [v1.1.1] — 2026-04-23

### Added

- `small_artifact_registry` input with conditional rules in `full.yml`

### Changed

- Updated devguard scanner image to v1.2.3

### Fixed

- Remote authentication for fetching attestations

---

## [v1.1.0] — 2026-03-17

### Added

- Source provenance attestation (openCode only)
- Needs and dependencies wiring for the attestation job

### Changed

- Source attestation flow simplified
- Scanner updated to v1.1.0

### Fixed

- Stage declaration missing from attestation job
- Dependencies key removed from incorrect job
- Needs relationships corrected across attestation jobs

---

## [v1.0.1] — 2026-03-06

### Added

- `push-and-attest.yml` template combining push and attestation into a single pipeline step
- `devguard_origin` forwarding to downstream jobs

### Changed

- kaniko image updated in `build-oci-image` and `push-oci-image`
- devguard scanner updated to v1.0.1

---

## [v1.0.0] — 2026-02-20

### Added

- Docker-based build support via `build-with-docker` flag
- `runner_tags` input (array) for all build jobs
- `containerfile` for docker-crane setup
- Multi-branch pipeline support via GitLab API trigger
- `resource_group` to limit parallel pipeline execution
- SBOM and VEX report upload from artifacts

### Changed

- Runner tags unified to array syntax across all templates
- SBOM upload job reference updated in container lifecycle template
- Removed unused `deploy_stage` input from container lifecycle template
- Public pipelines no longer require public auth

### Fixed

- Default `runner_tags` value corrected from string to array
- Artifact name mismatch in `full.yml`
- Broken syntax in several templates
- Dependency ordering for `push_oci_image` job

---

## [v1.0.0-rc.5] and earlier

Initial release candidates establishing the core pipeline templates:

- `container-lifecycle.yml` — full container build, scan, sign, and attest workflow
- `container-scanning.yml` — standalone container image scanning
- `build-oci-image.yml` — OCI image build via kaniko
- `push-oci-image.yml` — image push and registry interaction
- `sign-oci-image.yml` — cosign-based image signing
- `attest.yml` — supply chain attestation
- `software-composition-analysis.yml` — SCA scanning
- `static-application-security-testing.yml` — SAST scanning
- `secret-scanning.yml` — secret detection
- `infrastructure-as-code-scanning.yml` — IaC scanning
- `sbom-upload.yml` / `vex-upload.yml` / `sarif-upload.yml` — report upload templates
- `discover-baseimage-attestations.yml` — base image attestation discovery
- `generate-tag.yml` — image tag generation
- `full.yml` — full pipeline composition
