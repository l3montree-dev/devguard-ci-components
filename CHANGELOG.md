# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
