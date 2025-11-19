# Vulnerability Scanning with DevGuard CI/CD Components

DevGuard simplifies vulnerability management for developers by integrating key security practices directly into the CI/CD workflow. With DevGuard, you can seamlessly perform tasks such as Software Composition Analysis (SCA), Container Scanning, Secret Scanning, SAST, IaC Scanning, and more, ensuring that vulnerabilities are detected and addressed early in your pipeline.

Read more about DevGuard and its features [here](https://github.com/l3montree-dev/devguard).

## DevGuard Components

Below are the DevGuard components available for use in your CI/CD pipeline. Each component addresses specific security needs and is configurable with simple YAML snippets.

### devguard:full

The `devguard:full` component combines all security scanning components (Secret Scanning, SAST, IaC Scanning, Software Composition Analysis, Container Scanning, Image Building, Pushing, Signing, and Attestation) into a single unified DevSecOps pipeline. This allows you to implement a comprehensive security workflow with minimal configuration.

#### Usage Example

```yaml
stages:
  - test
  - oci-image
  - attestation

include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/full@~latest
    inputs:
      devguard_api_url: "https://api.devguard.org"
      devguard_web_ui: "https://app.devguard.org"
      devguard_asset_name: "$DEVGUARD_ASSET_NAME"
      devguard_token: "$DEVGUARD_TOKEN"
```

**Note:** This component syntax works only on the official GitLab instance (gitlab.com). For self-hosted GitLab instances, use the remote include syntax instead:

```yaml
include:
  - remote: "https://gitlab.com/l3montree/devguard/-/raw/main/templates/full.yml"
    inputs:
      # ... same inputs as above
```

#### Inputs

For a complete list of inputs and their descriptions, see the [input spec in the template file](https://gitlab.com/l3montree/devguard/-/blob/main/templates/full.yml#L4-L47).

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/full.yml)
- [Usage Example Project](https://gitlab.com/l3montree/devguard-ci-components-test-project/-/tree/full)

### devguard:secret-scanning

The `devguard:secret-scanning` component is designed to identify sensitive information such as API keys, passwords, and other secrets within your codebase using Gitleaks. By integrating secret scanning into your CI/CD pipeline, developers can proactively prevent the accidental exposure of confidential data, enhancing the overall security posture of the application.

#### Usage Example

```yaml
stages:
  - test

include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/secret-scanning@~latest
    inputs:
      devguard_api_url: "https://api.devguard.org"
      devguard_web_ui: "https://app.devguard.org"
      devguard_asset_name: "$DEVGUARD_ASSET_NAME"
      devguard_token: "$DEVGUARD_TOKEN"
      stage: "test"
```

**Note:** This component syntax works only on the official GitLab instance (gitlab.com). For self-hosted GitLab instances, use the remote include syntax instead:

```yaml
include:
  - remote: "https://gitlab.com/l3montree/devguard/-/raw/main/templates/secret-scanning.yml"
    inputs:
      # ... same inputs as above
```

#### Inputs

For a complete list of inputs and their descriptions, see the [input spec in the template file](https://gitlab.com/l3montree/devguard/-/blob/main/templates/secret-scanning.yml#L4-L58).

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/secret-scanning.yml)
- [Usage Example Project](https://gitlab.com/l3montree/devguard-ci-components-test-project/-/tree/secret-scanning)

### devguard:static-application-security-testing

The `devguard:static-application-security-testing` component focuses on Static Application Security Testing (SAST) to analyze your source code for vulnerabilities without executing it. This component helps in identifying security flaws early in the development cycle, ensuring that code quality and security are prioritized before deployment.

#### Usage Example

```yaml
stages:
  - test

include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/static-application-security-testing@~latest
    inputs:
      devguard_api_url: "https://api.devguard.org"
      devguard_web_ui: "https://app.devguard.org"
      devguard_asset_name: "$DEVGUARD_ASSET_NAME"
      devguard_token: "$DEVGUARD_TOKEN"
      stage: "test"
```

**Note:** This component syntax works only on the official GitLab instance (gitlab.com). For self-hosted GitLab instances, use the remote include syntax instead:

```yaml
include:
  - remote: "https://gitlab.com/l3montree/devguard/-/raw/main/templates/static-application-security-testing.yml"
    inputs:
      # ... same inputs as above
```

#### Inputs

For a complete list of inputs and their descriptions, see the [input spec in the template file](https://gitlab.com/l3montree/devguard/-/blob/main/templates/static-application-security-testing.yml#L4-L57).

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/static-application-security-testing.yml)

### devguard:infrastructure-as-code-scanning

The `devguard:infrastructure-as-code-scanning` component scans Infrastructure as Code (IaC) files for misconfigurations and security issues. This helps identify potential security risks in your infrastructure definitions before deployment.

#### Usage Example

```yaml
stages:
  - test

include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/infrastructure-as-code-scanning@~latest
    inputs:
      devguard_api_url: "https://api.devguard.org"
      devguard_web_ui: "https://app.devguard.org"
      devguard_asset_name: "$DEVGUARD_ASSET_NAME"
      devguard_token: "$DEVGUARD_TOKEN"
      stage: "test"
```

**Note:** This component syntax works only on the official GitLab instance (gitlab.com). For self-hosted GitLab instances, use the remote include syntax instead:

```yaml
include:
  - remote: "https://gitlab.com/l3montree/devguard/-/raw/main/templates/infrastructure-as-code-scanning.yml"
    inputs:
      # ... same inputs as above
```

#### Inputs

For a complete list of inputs and their descriptions, see the [input spec in the template file](https://gitlab.com/l3montree/devguard/-/blob/main/templates/infrastructure-as-code-scanning.yml#L4-L57).

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/infrastructure-as-code-scanning.yml)

### devguard:software-composition-analysis

The `devguard:software-composition-analysis` component performs Software Composition Analysis (SCA) to detect vulnerabilities in your project's dependencies. It scans your software for outdated or vulnerable third-party libraries, helping you manage risks early in the development process. This component is based on the Trivy project.

#### Usage Example

```yaml
stages:
  - test

include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/software-composition-analysis@~latest
    inputs:
      devguard_api_url: "https://api.devguard.org"
      devguard_web_ui: "https://app.devguard.org"
      devguard_asset_name: "$DEVGUARD_ASSET_NAME"
      devguard_token: "$DEVGUARD_TOKEN"
      stage: "test"
```

**Note:** This component syntax works only on the official GitLab instance (gitlab.com). For self-hosted GitLab instances, use the remote include syntax instead:

```yaml
include:
  - remote: "https://gitlab.com/l3montree/devguard/-/raw/main/templates/software-composition-analysis.yml"
    inputs:
      # ... same inputs as above
```

#### Inputs

For a complete list of inputs and their descriptions, see the [input spec in the template file](https://gitlab.com/l3montree/devguard/-/blob/main/templates/software-composition-analysis.yml#L4-L73).

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/software-composition-analysis.yml)
- [Usage Example Project](https://gitlab.com/l3montree/devguard-ci-components-test-project/-/tree/software-composition-analysis)

### devguard:container-scanning

The `devguard:container-scanning` component scans your container images for vulnerabilities. This ensures that your Docker images do not contain known vulnerabilities before they are deployed. This component can either scan an image from a tarball artifact or fetch and scan an image from a registry.

#### Usage Example

```yaml
stages:
  - oci-image

include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/container-scanning@~latest
    inputs:
      devguard_api_url: "https://api.devguard.org"
      devguard_web_ui: "https://app.devguard.org"
      devguard_asset_name: "$DEVGUARD_ASSET_NAME"
      devguard_token: "$DEVGUARD_TOKEN"
      stage: "oci-image"
      image_tar_path: "image.tar"
```

**Note:** This component syntax works only on the official GitLab instance (gitlab.com). For self-hosted GitLab instances, use the remote include syntax instead:

```yaml
include:
  - remote: "https://gitlab.com/l3montree/devguard/-/raw/main/templates/container-scanning.yml"
    inputs:
      # ... same inputs as above
```

**Note:** Use `image_tar_path` to scan a local tar file (e.g., from a previous build job), or use `image_tag` to scan a remote image from a registry (e.g., `"$CI_REGISTRY_IMAGE:tag"`). If `image_tag` is provided, it takes precedence over `image_tar_path`.

#### Inputs

For a complete list of inputs and their descriptions, see the [input spec in the template file](https://gitlab.com/l3montree/devguard/-/blob/main/templates/container-scanning.yml#L4-L86).

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/container-scanning.yml)
- [Usage Example Project](https://gitlab.com/l3montree/devguard-ci-components-test-project/-/tree/container-scanning)

### devguard:generate-tag

The `devguard:generate-tag` component generates a unique tag for your container images based on branch name, commit SHA, and timestamp. This ensures consistent and traceable image versioning across your pipeline.

#### Usage Example

```yaml
stages:
  - oci-image

include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/generate-tag@~latest
    inputs:
      stage: "oci-image"
```

**Note:** This component syntax works only on the official GitLab instance (gitlab.com). For self-hosted GitLab instances, use the remote include syntax instead:

```yaml
include:
  - remote: "https://gitlab.com/l3montree/devguard/-/raw/main/templates/generate-tag.yml"
    inputs:
      # ... same inputs as above
```

#### Inputs

For a complete list of inputs and their descriptions, see the [input spec in the template file](https://gitlab.com/l3montree/devguard/-/blob/main/templates/generate-tag.yml#L4-L37).

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/generate-tag.yml)

### devguard:build-oci-image

The `devguard:build-oci-image` component builds OCI (Open Container Initiative) images using Kaniko, which allows building Docker images securely without requiring privileged access. This component also generates in-toto attestations for the build process, creating a verifiable supply chain trail.

#### Usage Example

```yaml
stages:
  - oci-image

include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/build-oci-image@~latest
    inputs:
      devguard_api_url: "https://api.devguard.org"
      devguard_asset_name: "$DEVGUARD_ASSET_NAME"
      devguard_token: "$DEVGUARD_TOKEN"
      stage: "oci-image"
      image: "image.tar"
      image_tag: "$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA"
      build_args: "--context $CI_PROJECT_DIR --dockerfile $CI_PROJECT_DIR/Dockerfile"
```

**Note:** This component syntax works only on the official GitLab instance (gitlab.com). For self-hosted GitLab instances, use the remote include syntax instead:

```yaml
include:
  - remote: "https://gitlab.com/l3montree/devguard/-/raw/main/templates/build-oci-image.yml"
    inputs:
      # ... same inputs as above
```

#### Inputs

For a complete list of inputs and their descriptions, see the [input spec in the template file](https://gitlab.com/l3montree/devguard/-/blob/main/templates/build-oci-image.yml#L4-L67).

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/build-oci-image.yml)
- [Usage Example Project](https://gitlab.com/l3montree/devguard-ci-components-test-project/-/tree/build-oci-image)

### devguard:push-oci-image

The `devguard:push-oci-image` component pushes the built OCI image to the GitLab container registry and also creates a branch-specific `-latest` tag. This component also generates in-toto attestations for the deployment step.

#### Usage Example

```yaml
stages:
  - oci-image

include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/push-oci-image@~latest
    inputs:
      devguard_api_url: "https://api.devguard.org"
      devguard_asset_name: "$DEVGUARD_ASSET_NAME"
      devguard_token: "$DEVGUARD_TOKEN"
      stage: "oci-image"
      image: "image.tar"
      image_tag: "$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA"
```

**Note:** This component syntax works only on the official GitLab instance (gitlab.com). For self-hosted GitLab instances, use the remote include syntax instead:

```yaml
include:
  - remote: "https://gitlab.com/l3montree/devguard/-/raw/main/templates/push-oci-image.yml"
    inputs:
      # ... same inputs as above
```

#### Inputs

For a complete list of inputs and their descriptions, see the [input spec in the template file](https://gitlab.com/l3montree/devguard/-/blob/main/templates/push-oci-image.yml#L4-L63).

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/push-oci-image.yml)

### devguard:sign-oci-image

The `devguard:sign-oci-image` component ensures that your container images are signed using Cosign for verification purposes, providing an additional layer of security before deployment. This component is essential for organizations that prioritize image integrity and wish to validate their images against tampering.

#### Usage Example

```yaml
stages:
  - attestation

include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/sign-oci-image@~latest
    inputs:
      devguard_api_url: "https://api.devguard.org"
      devguard_asset_name: "$DEVGUARD_ASSET_NAME"
      devguard_token: "$DEVGUARD_TOKEN"
      stage: "attestation"
      images:
        - "$CI_REGISTRY_IMAGE:latest"
```

**Note:** This component syntax works only on the official GitLab instance (gitlab.com). For self-hosted GitLab instances, use the remote include syntax instead:

```yaml
include:
  - remote: "https://gitlab.com/l3montree/devguard/-/raw/main/templates/sign-oci-image.yml"
    inputs:
      # ... same inputs as above
```

#### Inputs

For a complete list of inputs and their descriptions, see the [input spec in the template file](https://gitlab.com/l3montree/devguard/-/blob/main/templates/sign-oci-image.yml#L4-L53).

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/sign-oci-image.yml)
- [Usage Example Project](https://gitlab.com/l3montree/devguard-ci-components-test-project/-/tree/sign-oci-image)

### devguard:attest

The `devguard:attest` component creates and attaches attestations to your container images. Attestations provide verifiable metadata about your artifacts, such as SBOMs, vulnerability scans, or custom attestations. This component can download attestations from URLs or use local files.

#### Usage Example

```yaml
stages:
  - attestation

include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/attest@~latest
    inputs:
      devguard_api_url: "https://api.devguard.org"
      devguard_asset_name: "$DEVGUARD_ASSET_NAME"
      devguard_token: "$DEVGUARD_TOKEN"
      stage: "attestation"
      devguard_artifact_name: "pkg:oci/my-app"
      image: "$CI_REGISTRY_IMAGE:latest"
      attestations:
        - source: "sbom.json"
          predicate_type: "https://spdx.dev/Document"
        - source: "https://api.devguard.org/api/v1/artifacts/ARTIFACT_NAME/sbom"
          predicate_type: "https://in-toto.io/attestation/scai/attribute-report/v0.2"
```

**Note:** This component syntax works only on the official GitLab instance (gitlab.com). For self-hosted GitLab instances, use the remote include syntax instead:

```yaml
include:
  - remote: "https://gitlab.com/l3montree/devguard/-/raw/main/templates/attest.yml"
    inputs:
      # ... same inputs as above
```

#### Inputs

For a complete list of inputs and their descriptions, see the [input spec in the template file](https://gitlab.com/l3montree/devguard/-/blob/main/templates/attest.yml#L4-L71).

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/attest.yml)

### devguard:sarif-upload

The `devguard:sarif-upload` component uploads SARIF (Static Analysis Results Interchange Format) files to DevGuard. This allows you to integrate results from external security scanners and SAST tools into your DevGuard dashboard for unified vulnerability management.

#### Usage Example

```yaml
stages:
  - test

include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/sarif-upload@~latest
    inputs:
      devguard_api_url: "https://api.devguard.org"
      devguard_web_ui: "https://app.devguard.org"
      devguard_asset_name: "$DEVGUARD_ASSET_NAME"
      devguard_token: "$DEVGUARD_TOKEN"
      stage: "test"
      sarif_file: "results.sarif"
```

**Note:** This component syntax works only on the official GitLab instance (gitlab.com). For self-hosted GitLab instances, use the remote include syntax instead:

```yaml
include:
  - remote: "https://gitlab.com/l3montree/devguard/-/raw/main/templates/sarif-upload.yml"
    inputs:
      # ... same inputs as above
```

#### Inputs

For a complete list of inputs and their descriptions, see the [input spec in the template file](https://gitlab.com/l3montree/devguard/-/blob/main/templates/sarif-upload.yml#L4-L58).

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/sarif-upload.yml)
- [Usage Example Project](https://gitlab.com/l3montree/devguard-ci-components-test-project/-/tree/sarif-upload)

### devguard:sbom-upload

The `devguard:sbom-upload` component uploads Software Bill of Materials (SBOM) files to DevGuard for vulnerability analysis. This is useful when you have pre-generated SBOM files from external tools that you want to analyze for vulnerabilities within DevGuard.

#### Usage Example

```yaml
stages:
  - test

include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/sbom-upload@~latest
    inputs:
      devguard_api_url: "https://api.devguard.org"
      devguard_web_ui: "https://app.devguard.org"
      devguard_asset_name: "$DEVGUARD_ASSET_NAME"
      devguard_token: "$DEVGUARD_TOKEN"
      stage: "test"
      sbom_file: "sbom.json"
```

**Note:** This component syntax works only on the official GitLab instance (gitlab.com). For self-hosted GitLab instances, use the remote include syntax instead:

```yaml
include:
  - remote: "https://gitlab.com/l3montree/devguard/-/raw/main/templates/sbom-upload.yml"
    inputs:
      # ... same inputs as above
```

#### Inputs

For a complete list of inputs and their descriptions, see the [input spec in the template file](https://gitlab.com/l3montree/devguard/-/blob/main/templates/sbom-upload.yml#L4-L70).

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/sbom-upload.yml)
- [Usage Example Project](https://gitlab.com/l3montree/devguard-ci-components-test-project/-/tree/sbom-upload)

### devguard:vex-upload

The `devguard:vex-upload` component uploads Vulnerability Exploitability eXchange (VEX) documents to DevGuard. VEX files provide additional context about vulnerabilities, such as whether they are exploitable in your specific context, helping to prioritize remediation efforts.

#### Usage Example

```yaml
stages:
  - test

include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/vex-upload@~latest
    inputs:
      devguard_api_url: "https://api.devguard.org"
      devguard_asset_name: "$DEVGUARD_ASSET_NAME"
      devguard_token: "$DEVGUARD_TOKEN"
      stage: "test"
      vex_file: "vex.json"
```

**Note:** This component syntax works only on the official GitLab instance (gitlab.com). For self-hosted GitLab instances, use the remote include syntax instead:

```yaml
include:
  - remote: "https://gitlab.com/l3montree/devguard/-/raw/main/templates/vex-upload.yml"
    inputs:
      # ... same inputs as above
```

#### Inputs

For a complete list of inputs and their descriptions, see the [input spec in the template file](https://gitlab.com/l3montree/devguard/-/blob/main/templates/vex-upload.yml#L4-L62).

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/vex-upload.yml)
- [Usage Example Project](https://gitlab.com/l3montree/devguard-ci-components-test-project/-/tree/vex-upload)

### devguard:release

The `devguard:release` component creates GitLab releases automatically when tags are pushed. This component helps automate your release process by creating structured release notes and attaching assets to releases.

#### Usage Example

```yaml
stages:
  - test

include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/release@~latest
    inputs:
      stage: "test"
      release_tag: "$CI_COMMIT_TAG"
      release_name: "Release $CI_COMMIT_TAG"
```

**Note:** This component syntax works only on the official GitLab instance (gitlab.com). For self-hosted GitLab instances, use the remote include syntax instead:

```yaml
include:
  - remote: "https://gitlab.com/l3montree/devguard/-/raw/main/templates/release.yml"
    inputs:
      # ... same inputs as above
```

#### Inputs

For a complete list of inputs and their descriptions, see the [input spec in the template file](https://gitlab.com/l3montree/devguard/-/blob/main/templates/release.yml#L4-L52).

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/release.yml)
- [Usage Example Project](https://gitlab.com/l3montree/devguard-ci-components-test-project/-/tree/release)

### devguard:discover-baseimage-attestations

The `devguard:discover-baseimage-attestations` component discovers and downloads attestations from base images referenced in your Dockerfile or Containerfile. This helps maintain a complete attestation chain for your entire image hierarchy.

#### Usage Example

```yaml
stages:
  - build

include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/discover-baseimage-attestations@~latest
    inputs:
      stage: "build"
      path: "Dockerfile"
      output: "attestations"
      predicate_type: "https://spdx.dev/Document"
```

**Note:** This component syntax works only on the official GitLab instance (gitlab.com). For self-hosted GitLab instances, use the remote include syntax instead:

```yaml
include:
  - remote: "https://gitlab.com/l3montree/devguard/-/raw/main/templates/discover-baseimage-attestations.yml"
    inputs:
      # ... same inputs as above
```

#### Inputs

For a complete list of inputs and their descriptions, see the [input spec in the template file](https://gitlab.com/l3montree/devguard/-/blob/main/templates/discover-baseimage-attestations.yml#L4-L40).

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/discover-baseimage-attestations.yml)
- [Usage Example Project](https://gitlab.com/l3montree/devguard-ci-components-test-project/-/tree/discover-baseimage-attestations)

### devguard:container-lifecycle

The `devguard:container-lifecycle` component provides a complete, end-to-end workflow for building, scanning, and deploying OCI (Open Container Initiative) images with full supply chain security. This comprehensive component combines multiple individual components (generate-tag, build-oci-image, container-scanning, push-oci-image, sign-oci-image, and attest) into a streamlined pipeline that handles everything from tag generation to signing and attestation. It's ideal for teams who want a production-ready container image workflow with built-in security scanning and attestation without having to configure each step individually.

#### Usage Example

```yaml
stages:
  - oci-image
  - attestation

include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/container-lifecycle@~latest
    inputs:
      devguard_api_url: "https://api.devguard.org"
      devguard_web_ui: "https://app.devguard.org"
      devguard_asset_name: "$DEVGUARD_ASSET_NAME"
      devguard_token: "$DEVGUARD_TOKEN"
      build_stage: "oci-image"
      attest_stage: "attestation"
      build_args: "--context $CI_PROJECT_DIR --dockerfile $CI_PROJECT_DIR/Dockerfile"
```

**Note:** This component syntax works only on the official GitLab instance (gitlab.com). For self-hosted GitLab instances, use the remote include syntax instead:

```yaml
include:
  - remote: "https://gitlab.com/l3montree/devguard/-/raw/main/templates/container-lifecycle.yml"
    inputs:
      # ... same inputs as above
```

**Note:** This component automatically generates a unique image tag based on your branch and commit, builds the image using Kaniko, scans it for vulnerabilities, pushes it to the registry, signs it with Cosign, and attaches SBOM attestations. The generated `$IMAGE_TAG` variable is automatically passed between all jobs in the workflow.

#### Inputs

For a complete list of inputs and their descriptions, see the [input spec in the template file](https://gitlab.com/l3montree/devguard/-/blob/main/templates/container-lifecycle.yml#L4-L88).

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/container-lifecycle.yml)
- [Usage Example Project](https://gitlab.com/l3montree/devguard-ci-components-test-project/-/tree/container-lifecycle)
