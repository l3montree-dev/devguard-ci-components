# Vulnerability Scanning with DevGuard CI/CD Components

DevGuard simplifies vulnerability management for developers by integrating key security practices directly into the CI/CD workflow. With DevGuard, you can seamlessly perform tasks such as Software Composition Analysis (SCA), Container Scanning, Secret Scanning, SAST, IaC Scanning, and more, ensuring that vulnerabilities are detected and addressed early in your pipeline.

You can see how DevGuard works in practice [here](https://main.devguard.org/l3montree-cybersecurity/projects/devguard-pipeline/assets/devguard-pipeline), where this repository is scanned using the same components.

Read more about DevGuard and its features [here](https://github.com/l3montree-dev/devguard).

## DevGuard Components

Below are the DevGuard components available for use in your CI/CD pipeline. Each component addresses specific security needs and is configurable with simple YAML snippets.

### devguard:full

The `devguard:full` component combines all security scanning components (Secret Scanning, SAST, IaC Scanning, Software Composition Analysis, Container Scanning, Image Building, Pushing, Signing, and Attestation) into a single unified DevSecOps pipeline. This allows you to implement a comprehensive security workflow with minimal configuration.

#### Usage Example

```yaml
include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/full@~latest
    inputs:
      devguard_asset_name: "$DEVGUARD_ASSET_NAME"
      devguard_token: "$DEVGUARD_TOKEN"
```

#### Inputs

| Name                     | Description                                                                                                                                   | Default Value                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `devguard_token`         | The DevGuard API token (your private key)                                                                                                     |                                                                     |
| `devguard_asset_name`    | The DevGuard asset name (your repository in DevGuard)                                                                                         |                                                                     |
| `devguard_api_url`       | The DevGuard API URL                                                                                                                          | `https://api.devguard.org`                                          |
| `devguard_web_ui`        | The DevGuard Web-UI Instance URL                                                                                                              | `https://app.devguard.org`                                          |
| `devguard_artifact_name` | The name of the artifact you are building. Useful when a pipeline builds more than one artifact. If not provided, will use the generated PURL | ``                                                                  |
| `runner_tags`            | The runner tags used to select appropriate CI runners                                                                                         | ``                                                                  |
| `job_suffix`             | A suffix to append to the job name (useful when using the component several times in one pipeline)                                            | ``                                                                  |
| `git_strategy`           | The Git strategy to use for the job                                                                                                           | `fetch`                                                             |
| `pull_policy`            | The pull policy for the container image (can be [always, if-not-present, never])                                                              | `if-not-present`                                                    |
| `allow_failure`          | Whether the jobs are allowed to fail without stopping the pipeline                                                                            | `false`                                                             |
| `build_args`             | The build arguments to pass to the Docker build command                                                                                       | `--context $CI_PROJECT_DIR --dockerfile $CI_PROJECT_DIR/Dockerfile` |
| `version`                | The version of the components. Since we are using remote templates, we need to specify the version of the components                          | `main`                                                              |

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/full.yml)
- [Usage Example Project](https://gitlab.com/l3montree/devguard-ci-components-test-project/-/tree/full)

### devguard:secret-scanning

The `devguard:secret-scanning` component is designed to identify sensitive information such as API keys, passwords, and other secrets within your codebase using Gitleaks. By integrating secret scanning into your CI/CD pipeline, developers can proactively prevent the accidental exposure of confidential data, enhancing the overall security posture of the application.

#### Usage Example

```yaml
include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/secret-scanning@~latest
    inputs:
      devguard_asset_name: "$DEVGUARD_ASSET_NAME"
      devguard_token: "$DEVGUARD_TOKEN"
      stage: "test"
      runner_tags: "deployment"
```

#### Inputs

| Name                  | Description                                                                                        | Default Value                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `devguard_api_url`    | The DevGuard API URL                                                                               | `https://api.devguard.org`                                                  |
| `devguard_asset_name` | The DevGuard asset name (your repository in DevGuard)                                              |                                                                             |
| `devguard_token`      | The DevGuard API token (your private key)                                                          | `$DEVGUARD_TOKEN`                                                           |
| `devguard_web_ui`     | The DevGuard Web-UI Instance URL                                                                   | `https://app.devguard.org`                                                  |
| `runner_tags`         | The runner tags used to select appropriate CI runners                                              | ``                                                                          |
| `stage`               | The stage where the scan is executed                                                               | `test`                                                                      |
| `job_suffix`          | A suffix to append to the job name (useful when using the component several times in one pipeline) | ``                                                                          |
| `git_strategy`        | The Git strategy to use for the job                                                                | `clone`                                                                     |
| `pull_policy`         | The pull policy for the container image (can be [always, if-not-present, never])                   | `if-not-present`                                                            |
| `allow_failure`       | Whether the job is allowed to fail without stopping the pipeline                                   | `false`                                                                     |
| `needs`               | List of jobs this scan depends on                                                                  | `[]`                                                                        |
| `dependencies`        | List of jobs to download artifacts from                                                            | `[]`                                                                        |
| `path`                | The path to the git repository to scan                                                             | `$CI_PROJECT_DIR`                                                           |
| `default_ref`         | The default branch reference                                                                       | `$CI_DEFAULT_BRANCH`                                                        |
| `commit_ref`          | The branch or tag reference to scan                                                                | `$CI_COMMIT_REF_NAME`                                                       |
| `is_tag`              | Is the current commit a tag                                                                        | `$(if [ "$CI_COMMIT_TAG" != "" ]; then echo "true"; else echo "false"; fi)` |

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/secret-scanning.yml)
- [Usage Example Project](https://gitlab.com/l3montree/devguard-ci-components-test-project/-/tree/secret-scanning)

### devguard:static-application-security-testing

The `devguard:static-application-security-testing` component focuses on Static Application Security Testing (SAST) to analyze your source code for vulnerabilities without executing it. This component helps in identifying security flaws early in the development cycle, ensuring that code quality and security are prioritized before deployment.

#### Usage Example

```yaml
include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/static-application-security-testing@~latest
    inputs:
      devguard_asset_name: "$DEVGUARD_ASSET_NAME"
      devguard_token: "$DEVGUARD_TOKEN"
      stage: "test"
      runner_tags: "deployment"
```

#### Inputs

| Name                  | Description                                                                                        | Default Value                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `devguard_api_url`    | The DevGuard API URL                                                                               | `https://api.devguard.org`                                                  |
| `devguard_asset_name` | The DevGuard asset name (your repository in DevGuard)                                              |                                                                             |
| `devguard_token`      | The DevGuard API token (your private key)                                                          |                                                                             |
| `devguard_web_ui`     | The DevGuard Web-UI Instance URL                                                                   | `https://app.devguard.org`                                                  |
| `runner_tags`         | The runner tags used to select appropriate CI runners                                              | ``                                                                          |
| `stage`               | The stage where the image is scanned                                                               | `test`                                                                      |
| `job_suffix`          | A suffix to append to the job name (useful when using the component several times in one pipeline) | ``                                                                          |
| `git_strategy`        | The Git strategy to use for the job                                                                | `fetch`                                                                     |
| `pull_policy`         | The pull policy for the Docker image                                                               | `always`                                                                    |
| `allow_failure`       | Whether the job is allowed to fail without stopping the pipeline                                   | `false`                                                                     |
| `needs`               | The jobs that this job depends on                                                                  | `[]`                                                                        |
| `dependencies`        | The jobs to download artifacts from                                                                | `[]`                                                                        |
| `path`                | The path to the git repository to scan                                                             | `$CI_PROJECT_DIR`                                                           |
| `default_ref`         | The default branch reference                                                                       | `$CI_DEFAULT_BRANCH`                                                        |
| `commit_ref`          | The branch or tag reference to scan                                                                | `$CI_COMMIT_REF_NAME`                                                       |
| `is_tag`              | Is the current commit a tag                                                                        | `$(if [ "$CI_COMMIT_TAG" != "" ]; then echo "true"; else echo "false"; fi)` |

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/static-application-security-testing.yml)
- [Usage Example Project](https://gitlab.com/l3montree/devguard-ci-components-test-project/-/tree/static-application-security-testing)

### devguard:infrastructure-as-code-scanning

The `devguard:infrastructure-as-code-scanning` component scans Infrastructure as Code (IaC) files for misconfigurations and security issues. This helps identify potential security risks in your infrastructure definitions before deployment.

#### Usage Example

```yaml
include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/infrastructure-as-code-scanning@~latest
    inputs:
      devguard_asset_name: "$DEVGUARD_ASSET_NAME"
      devguard_token: "$DEVGUARD_TOKEN"
      stage: "test"
      runner_tags: "deployment"
```

#### Inputs

| Name                  | Description                                                                                        | Default Value                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `devguard_api_url`    | The DevGuard API URL                                                                               | `https://api.devguard.org`                                                  |
| `devguard_asset_name` | The DevGuard asset name (your repository in DevGuard)                                              |                                                                             |
| `devguard_token`      | The DevGuard API token (your private key)                                                          |                                                                             |
| `devguard_web_ui`     | The DevGuard Web-UI Instance URL                                                                   | `https://app.devguard.org`                                                  |
| `runner_tags`         | The runner tags used to select appropriate CI runners                                              | ``                                                                          |
| `stage`               | The stage where the image is scanned                                                               | `test`                                                                      |
| `job_suffix`          | A suffix to append to the job name (useful when using the component several times in one pipeline) | ``                                                                          |
| `git_strategy`        | The Git strategy to use for the job                                                                | `fetch`                                                                     |
| `pull_policy`         | The pull policy for the Docker image                                                               | `always`                                                                    |
| `allow_failure`       | Whether the job is allowed to fail without stopping the pipeline                                   | `false`                                                                     |
| `needs`               | The jobs that this job depends on                                                                  | `[]`                                                                        |
| `dependencies`        | The jobs to download artifacts from                                                                | `[]`                                                                        |
| `path`                | The path to the git repository to scan                                                             | `$CI_PROJECT_DIR`                                                           |
| `default_ref`         | Default branch reference                                                                           | `$CI_DEFAULT_BRANCH`                                                        |
| `commit_ref`          | Current commit reference                                                                           | `$CI_COMMIT_REF_NAME`                                                       |
| `is_tag`              | Is the current commit a tag                                                                        | `$(if [ "$CI_COMMIT_TAG" != "" ]; then echo "true"; else echo "false"; fi)` |

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/infrastructure-as-code-scanning.yml)
- [Usage Example Project](https://gitlab.com/l3montree/devguard-ci-components-test-project/-/tree/infrastructure-as-code-scanning)

### devguard:software-composition-analysis

The `devguard:software-composition-analysis` component performs Software Composition Analysis (SCA) to detect vulnerabilities in your project's dependencies. It scans your software for outdated or vulnerable third-party libraries, helping you manage risks early in the development process. This component is based on the Trivy project.

#### Usage Example

```yaml
include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/software-composition-analysis@~latest
    inputs:
      devguard_asset_name: "$DEVGUARD_ASSET_NAME"
      devguard_token: "$DEVGUARD_TOKEN"
      stage: "test"
      runner_tags: "deployment"
```

#### Inputs

| Name                     | Description                                                                                                                                                    | Default Value                                                               |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `devguard_api_url`       | The DevGuard API URL                                                                                                                                           | `https://api.devguard.org`                                                  |
| `devguard_asset_name`    | The DevGuard asset name (your repository in DevGuard)                                                                                                          |                                                                             |
| `devguard_token`         | The DevGuard API token (your private key)                                                                                                                      | `$DEVGUARD_TOKEN`                                                           |
| `devguard_artifact_name` | The name of the artifact you are building. Useful when a pipeline builds more than one artifact. If not provided, will use the generated PURL from built image | `source`                                                                    |
| `devguard_web_ui`        | The DevGuard Web-UI Instance URL                                                                                                                               | `https://app.devguard.org`                                                  |
| `devguard_origin`        | Origin of the SBOM (how it was generated). Examples: 'source-scanning', 'container-scanning', 'base-image'                                                     | `DEFAULT`                                                                   |
| `runner_tags`            | The runner tags used to select appropriate CI runners                                                                                                          | ``                                                                          |
| `stage`                  | The stage where the image is scanned                                                                                                                           | `test`                                                                      |
| `job_suffix`             | A suffix to append to the job name (useful when using the component several times in one pipeline)                                                             | ``                                                                          |
| `git_strategy`           | The Git strategy to use for the job                                                                                                                            | `fetch`                                                                     |
| `pull_policy`            | The pull policy for the Docker image                                                                                                                           | `always`                                                                    |
| `allow_failure`          | Whether the job is allowed to fail without stopping the pipeline                                                                                               | `false`                                                                     |
| `needs`                  | The jobs that this job depends on                                                                                                                              | `[]`                                                                        |
| `dependencies`           | The jobs to download artifacts from                                                                                                                            | `[]`                                                                        |
| `path`                   | The path to the git repository to scan                                                                                                                         | `$CI_PROJECT_DIR`                                                           |
| `default_ref`            | The default branch reference                                                                                                                                   | `$CI_DEFAULT_BRANCH`                                                        |
| `commit_ref`             | The branch or tag reference to scan                                                                                                                            | `$CI_COMMIT_REF_NAME`                                                       |
| `fail_on_risk`           | The risk level to fail the job on. Options are: none, low, medium, high, critical                                                                              | `critical`                                                                  |
| `fail_on_cvss`           | The CVSS score to fail the job on. Options are: none, low, medium, high, critical                                                                              | `critical`                                                                  |
| `is_tag`                 | Is the current commit a tag                                                                                                                                    | `$(if [ "$CI_COMMIT_TAG" != "" ]; then echo "true"; else echo "false"; fi)` |

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/software-composition-analysis.yml)
- [Usage Example Project](https://gitlab.com/l3montree/devguard-ci-components-test-project/-/tree/software-composition-analysis)

### devguard:container-scanning

The `devguard:container-scanning` component scans your container images for vulnerabilities. This ensures that your Docker images do not contain known vulnerabilities before they are deployed. This component can either scan an image from a tarball artifact or fetch and scan an image from a registry.

#### Usage Example

```yaml
include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/container-scanning@~latest
    inputs:
      devguard_asset_name: "$DEVGUARD_ASSET_NAME"
      devguard_token: "$DEVGUARD_TOKEN"
      image: "image.tar"
      runner_tags: "deployment"
```

#### Inputs

| Name                        | Description                                                                                                                                                    | Default Value                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `devguard_api_url`          | The url of the API to send the scan request to                                                                                                                 | `https://api.devguard.org`                                                  |
| `devguard_asset_name`       | The id of the asset which is scanned (your repository in DevGuard)                                                                                             |                                                                             |
| `devguard_origin`           | Origin of the SBOM (how it was generated). Examples: 'source-scanning', 'container-scanning', 'base-image'                                                     | `DEFAULT`                                                                   |
| `devguard_token`            | The DevGuard API token (your private key)                                                                                                                      |                                                                             |
| `devguard_web_ui`           | The DevGuard web UI URL                                                                                                                                        | `https://app.devguard.org`                                                  |
| `devguard_artifact_name`    | The name of the artifact you are building. Useful when a pipeline builds more than one artifact. If not provided, will use the generated PURL from built image | ``                                                                          |
| `runner_tags`               | The runner tags used to select appropriate CI runners                                                                                                          | ``                                                                          |
| `stage`                     | The stage where the image is scanned                                                                                                                           | `oci-image`                                                                 |
| `job_suffix`                | A suffix to append to the job name (useful when using the component several times in one pipeline)                                                             | ``                                                                          |
| `git_strategy`              | The Git strategy to use for the job                                                                                                                            | `fetch`                                                                     |
| `pull_policy`               | The pull policy for the Docker image                                                                                                                           | `always`                                                                    |
| `allow_failure`             | Whether the job is allowed to fail without stopping the pipeline                                                                                               | `false`                                                                     |
| `needs`                     | The jobs that this job depends on                                                                                                                              | `[]`                                                                        |
| `dependencies`              | The jobs to download artifacts from                                                                                                                            | `[]`                                                                        |
| `default_ref`               | Default branch reference                                                                                                                                       | `$CI_DEFAULT_BRANCH`                                                        |
| `commit_ref`                | Current commit reference                                                                                                                                       | `$CI_COMMIT_REF_NAME`                                                       |
| `registry`                  | Container registry URL                                                                                                                                         | `$CI_REGISTRY`                                                              |
| `registry_user`             | Container registry username                                                                                                                                    | `$CI_REGISTRY_USER`                                                         |
| `registry_password`         | Container registry password                                                                                                                                    | `$CI_REGISTRY_PASSWORD`                                                     |
| `image`                     | The image file to scan (e.g. image.tar)                                                                                                                        | `image.tar`                                                                 |
| `image_tag`                 | The tag of the image to scan. Leave empty to use the generated tag from the 'generate-tag' component                                                           | `$CI_REGISTRY_IMAGE`                                                        |
| `fetch_image_from_registry` | Whether the image should be fetched from the registry or from the artifacts                                                                                    | `false`                                                                     |
| `fail_on_risk`              | The risk level to fail the job on. Options are: none, low, medium, high, critical                                                                              | `critical`                                                                  |
| `fail_on_cvss`              | The CVSS score to fail the job on. Options are: none, low, medium, high, critical                                                                              | `critical`                                                                  |
| `is_tag`                    | Is the current commit a tag                                                                                                                                    | `$(if [ "$CI_COMMIT_TAG" != "" ]; then echo "true"; else echo "false"; fi)` |

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/container-scanning.yml)
- [Usage Example Project](https://gitlab.com/l3montree/devguard-ci-components-test-project/-/tree/container-scanning)

### devguard:generate-tag

The `devguard:generate-tag` component generates a unique tag for your container images based on branch name, commit SHA, and timestamp. This ensures consistent and traceable image versioning across your pipeline.

#### Usage Example

```yaml
include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/generate-tag@~latest
    inputs:
      stage: "oci-image"
      image_suffix: "web"
```

#### Inputs

| Name            | Description                                                                                        | Default Value |
| --------------- | -------------------------------------------------------------------------------------------------- | ------------- |
| `runner_tags`   | The runner tags used to select appropriate CI runners                                              | ``            |
| `stage`         | The stage where the image is scanned                                                               | `oci-image`   |
| `job_suffix`    | A suffix to append to the job name (useful when using the component several times in one pipeline) | ``            |
| `git_strategy`  | The Git strategy to use for the job                                                                | `fetch`       |
| `pull_policy`   | The pull policy for the Docker image                                                               | `always`      |
| `allow_failure` | Whether the job is allowed to fail without stopping the pipeline                                   | `false`       |
| `needs`         | The jobs that this job depends on                                                                  | `[]`          |
| `dependencies`  | The jobs to download artifacts from                                                                | `[]`          |
| `image_suffix`  | Suffix for the image name (e.g. 'web'). Leave empty for no suffix                                  | `default`     |

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/generate-tag.yml)
- [Usage Example Project](https://gitlab.com/l3montree/devguard-ci-components-test-project/-/tree/generate-tag)

### devguard:build-oci-image

The `devguard:build-oci-image` component builds OCI (Open Container Initiative) images using Kaniko, which allows building Docker images securely without requiring privileged access. This component also generates in-toto attestations for the build process, creating a verifiable supply chain trail.

#### Usage Example

```yaml
include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/build-oci-image@~latest
    inputs:
      devguard_asset_name: "$DEVGUARD_ASSET_NAME"
      devguard_token: "$DEVGUARD_TOKEN"
      build_args: "--context $CI_PROJECT_DIR --dockerfile $CI_PROJECT_DIR/Dockerfile"
      runner_tags: "deployment"
```

#### Inputs

| Name                  | Description                                                                                                                     | Default Value                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `devguard_api_url`    | The DevGuard API URL                                                                                                            | `https://api.devguard.org`                                          |
| `devguard_asset_name` | The name of the asset                                                                                                           |                                                                     |
| `devguard_token`      | The token to authenticate against the DevGuard API                                                                              |                                                                     |
| `runner_tags`         | The runner tags used to select appropriate CI runners                                                                           | ``                                                                  |
| `stage`               | The stage where the build is run                                                                                                | `oci-image`                                                         |
| `job_suffix`          | A suffix to append to the job name (useful when using the component several times in one pipeline)                              | ``                                                                  |
| `git_strategy`        | The Git strategy to use for the job                                                                                             | `fetch`                                                             |
| `pull_policy`         | The pull policy for the container image (can be [always, if-not-present, never])                                                | `if-not-present`                                                    |
| `allow_failure`       | Whether the job is allowed to fail without stopping the pipeline                                                                | `false`                                                             |
| `needs`               | List of jobs this attestation depends on                                                                                        | `[]`                                                                |
| `dependencies`        | List of jobs to download artifacts from                                                                                         | `[]`                                                                |
| `registry`            | Container registry URL                                                                                                          | `$CI_REGISTRY`                                                      |
| `registry_user`       | Container registry username                                                                                                     | `$CI_REGISTRY_USER`                                                 |
| `registry_password`   | Container registry password                                                                                                     | `$CI_REGISTRY_PASSWORD`                                             |
| `image`               | The image file to build (e.g. image.tar)                                                                                        | `image.tar`                                                         |
| `image_tag`           | The tag to use for the built image                                                                                              | `$CI_REGISTRY_IMAGE`                                                |
| `build_args`          | The build arguments to pass to the Kaniko build command                                                                         | `--context $CI_PROJECT_DIR --dockerfile $CI_PROJECT_DIR/Dockerfile` |
| `push_image`          | If your GitLab instance has small artifact size limits, set this to true to push the image to the registry instead of artifacts | `false`                                                             |
| `supplyChainId`       | The supply chain ID to use for the in-toto attestation                                                                          | `$CI_COMMIT_SHA`                                                    |

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/build-oci-image.yml)
- [Usage Example Project](https://gitlab.com/l3montree/devguard-ci-components-test-project/-/tree/build-oci-image)

### devguard:push-oci-image

The `devguard:push-oci-image` component pushes the built OCI image to the GitLab container registry and also creates a branch-specific `-latest` tag. This component also generates in-toto attestations for the deployment step.

#### Usage Example

```yaml
include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/push-oci-image@~latest
    inputs:
      devguard_asset_name: "$DEVGUARD_ASSET_NAME"
      devguard_token: "$DEVGUARD_TOKEN"
      image: "image.tar"
      runner_tags: "deployment"
```

#### Inputs

| Name                  | Description                                                                                                | Default Value              |
| --------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------- |
| `devguard_api_url`    | The DevGuard API URL                                                                                       | `https://api.devguard.org` |
| `devguard_asset_name` | The DevGuard asset name                                                                                    |                            |
| `devguard_token`      | The DevGuard token                                                                                         |                            |
| `runner_tags`         | The runner tags used to select appropriate CI runners                                                      | ``                         |
| `stage`               | The stage where the image is scanned                                                                       | `oci-image`                |
| `job_suffix`          | A suffix to append to the job name (useful when using the component several times in one pipeline)         | ``                         |
| `git_strategy`        | The Git strategy to use for the job                                                                        | `none`                     |
| `pull_policy`         | The pull policy for the Docker image                                                                       | `always`                   |
| `allow_failure`       | Whether the job is allowed to fail without stopping the pipeline                                           | `false`                    |
| `needs`               | The jobs that this job depends on                                                                          | `[]`                       |
| `dependencies`        | The jobs to download artifacts from                                                                        | `[]`                       |
| `registry`            | Container registry URL                                                                                     | `$CI_REGISTRY`             |
| `registry_user`       | Container registry username                                                                                | `$CI_REGISTRY_USER`        |
| `registry_password`   | Container registry password                                                                                | `$CI_REGISTRY_PASSWORD`    |
| `image`               | The image file to build (e.g. image.tar)                                                                   | `image.tar`                |
| `image_tag`           | The tag to use for the built image. Leave empty to use the generated tag from the 'generate-tag' component | `$CI_REGISTRY_IMAGE`       |
| `supplyChainId`       | The supply chain ID to use for the in-toto attestation                                                     | `$CI_COMMIT_SHA`           |

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/push-oci-image.yml)
- [Usage Example Project](https://gitlab.com/l3montree/devguard-ci-components-test-project/-/tree/push-oci-image)

### devguard:sign-oci-image

The `devguard:sign-oci-image` component ensures that your container images are signed using Cosign for verification purposes, providing an additional layer of security before deployment. This component is essential for organizations that prioritize image integrity and wish to validate their images against tampering.

#### Usage Example

```yaml
include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/sign-oci-image@~latest
    inputs:
      devguard_asset_name: "$DEVGUARD_ASSET_NAME"
      devguard_token: "$DEVGUARD_TOKEN"
      images:
        - "$CI_REGISTRY_IMAGE:latest"
```

#### Inputs

| Name                  | Description                                                                                        | Default Value              |
| --------------------- | -------------------------------------------------------------------------------------------------- | -------------------------- |
| `devguard_api_url`    | The DevGuard API URL                                                                               | `https://api.devguard.org` |
| `devguard_asset_name` | The DevGuard asset name                                                                            |                            |
| `devguard_token`      | The DevGuard API token (your private key)                                                          | `$DEVGUARD_TOKEN`          |
| `runner_tags`         | The runner tags used to select appropriate CI runners                                              | ``                         |
| `stage`               | The stage where the scan is executed                                                               | `attestation`              |
| `job_suffix`          | A suffix to append to the job name (useful when using the component several times in one pipeline) | ``                         |
| `git_strategy`        | The Git strategy to use for the job                                                                | `clone`                    |
| `pull_policy`         | The pull policy for the container image (can be [always, if-not-present, never])                   | `if-not-present`           |
| `allow_failure`       | Whether the job is allowed to fail without stopping the pipeline                                   | `false`                    |
| `needs`               | List of jobs this scan depends on                                                                  | `[]`                       |
| `dependencies`        | List of jobs to download artifacts from                                                            | `[]`                       |
| `registry`            | Container registry URL                                                                             | `$CI_REGISTRY`             |
| `registry_user`       | Container registry username                                                                        | `$CI_REGISTRY_USER`        |
| `registry_password`   | Container registry password                                                                        | `$CI_REGISTRY_PASSWORD`    |
| `images`              | The image tags to sign (array)                                                                     |                            |

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/sign-oci-image.yml)
- [Usage Example Project](https://gitlab.com/l3montree/devguard-ci-components-test-project/-/tree/sign-oci-image)

### devguard:attest

The `devguard:attest` component creates and attaches attestations to your container images. Attestations provide verifiable metadata about your artifacts, such as SBOMs, vulnerability scans, or custom attestations. This component can download attestations from URLs or use local files.

#### Usage Example

```yaml
include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/attest@~latest
    inputs:
      devguard_asset_name: "$DEVGUARD_ASSET_NAME"
      devguard_token: "$DEVGUARD_TOKEN"
      devguard_artifact_name: "pkg:oci/my-app"
      image: "$CI_REGISTRY_IMAGE:latest"
      attestations:
        - source: "sbom.json"
          predicate_type: "https://spdx.dev/Document"
        - source: "https://api.devguard.org/api/v1/artifacts/ARTIFACT_NAME/sbom"
          predicate_type: "https://in-toto.io/attestation/scai/attribute-report/v0.2"
```

#### Inputs

| Name                     | Description                                                                                                                                                                                                  | Default Value                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| `devguard_api_url`       | DevGuard API URL                                                                                                                                                                                             | `https://api.devguard.opencode.de`   |
| `devguard_asset_name`    | DevGuard asset name (e.g., @opencode/projects/oci/assets/k8s-tools)                                                                                                                                          |                                      |
| `devguard_token`         | DevGuard API token (use CI/CD variable)                                                                                                                                                                      |                                      |
| `devguard_artifact_name` | Artifact name in purl format (e.g., pkg:oci/k8s-tools)                                                                                                                                                       |                                      |
| `runner_tags`            | The runner tags used to select appropriate CI runners                                                                                                                                                        | ``                                   |
| `stage`                  | Pipeline stage for attestation job                                                                                                                                                                           | `attestation`                        |
| `job_suffix`             | A suffix to append to the job name (useful when using the component several times in one pipeline)                                                                                                           | ``                                   |
| `git_strategy`           | The Git strategy to use for the job                                                                                                                                                                          | `none`                               |
| `pull_policy`            | The pull policy for the container image (can be [always, if-not-present, never])                                                                                                                             | `if-not-present`                     |
| `allow_failure`          | Whether the job is allowed to fail without stopping the pipeline                                                                                                                                             | `false`                              |
| `needs`                  | List of jobs this attestation depends on                                                                                                                                                                     | `[]`                                 |
| `dependencies`           | List of jobs to download artifacts from                                                                                                                                                                      | `[]`                                 |
| `default_ref`            | Default branch reference                                                                                                                                                                                     | `$CI_DEFAULT_BRANCH`                 |
| `commit_ref`             | Current commit reference                                                                                                                                                                                     | `$CI_COMMIT_REF_NAME`                |
| `registry`               | Container registry URL                                                                                                                                                                                       | `$CI_REGISTRY`                       |
| `registry_user`          | Container registry username                                                                                                                                                                                  | `$CI_REGISTRY_USER`                  |
| `registry_password`      | Container registry password                                                                                                                                                                                  | `$CI_REGISTRY_PASSWORD`              |
| `attestations`           | List of attestations to create. Each item should have: source (file path OR full URL), predicate_type (the predicate type URL). Special string ARTIFACT_NAME will be replaced with URL-encoded artifact name | `[]`                                 |
| `image`                  | Docker image to use for attestation                                                                                                                                                                          | `To which container image to attest` |

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/attest.yml)
- [Usage Example Project](https://gitlab.com/l3montree/devguard-ci-components-test-project/-/tree/attest)

### devguard:discover-baseimage-attestations

The `devguard:discover-baseimage-attestations` component discovers and downloads attestations from base images referenced in your Dockerfile or Containerfile. This helps maintain a complete attestation chain for your entire image hierarchy.

#### Usage Example

```yaml
include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/discover-baseimage-attestations@~latest
    inputs:
      path: "Dockerfile"
      output: "attestations"
      predicate_type: "https://spdx.dev/Document"
```

#### Inputs

| Name                | Description                                                                                        | Default Value           |
| ------------------- | -------------------------------------------------------------------------------------------------- | ----------------------- |
| `stage`             | Pipeline stage for this job                                                                        | `build`                 |
| `predicate_type`    | The predicate type to discover. If empty, all attestations will be discovered                      | ``                      |
| `path`              | Path to the Containerfile/Dockerfile                                                               |                         |
| `output`            | Output directory for the discovered attestations                                                   | `.`                     |
| `registry_user`     | Container registry username                                                                        | `$CI_REGISTRY_USER`     |
| `registry_password` | Container registry password                                                                        | `$CI_REGISTRY_PASSWORD` |
| `registry`          | Container registry URL                                                                             | `$CI_REGISTRY`          |
| `needs`             | List of jobs this depends on                                                                       | `[]`                    |
| `dependencies`      | List of jobs to download artifacts from                                                            | `[]`                    |
| `job_suffix`        | A suffix to append to the job name (useful when using the component several times in one pipeline) | ``                      |
| `pull_policy`       | The pull policy for the container image (can be [always, if-not-present, never])                   | `if-not-present`        |

**Links:**

- [Template Source](https://gitlab.com/l3montree/devguard/-/blob/main/templates/discover-baseimage-attestations.yml)
- [Usage Example Project](https://gitlab.com/l3montree/devguard-ci-components-test-project/-/tree/discover-baseimage-attestations)
