# Vulnerability Scanning with DevGuard CI/CD Components

DevGuard simplifies vulnerability management for developers by integrating key security practices directly into the CI/CD workflow. With DevGuard, you can seamlessly perform tasks such as Software Composition Analysis (SCA) and Container Scanning, ensuring that vulnerabilities are detected and addressed early in your pipeline.

You can see how DevGuard works in practice [here](https://main.devguard.org/l3montree-cybersecurity/projects/devguard-pipeline/assets/devguard-pipeline), where this repository is scanned using the same components.

Read more about DevGuard and its features [here](https://github.com/l3montree-dev/devguard).


## DevGuard Components

Below are the DevGuard components available for use in your CI/CD pipeline. Each component addresses specific security needs and is configurable with simple YAML snippets.

### devguard-software-composition-analysis

The `devguard-software-composition-analysis` component performs Software Composition Analysis (SCA) to detect vulnerabilities in your project’s dependencies. It scans your software for outdated or vulnerable third-party libraries, helping you manage risks early in the development process.

#### Usage Example

```yaml
include:
  - component: $CI_SERVER_FQDN/$CI_PROJECT_PATH/sca@$CI_COMMIT_SHA
    inputs:
      asset_name: "$DEVGUARD_ASSET_NAME"
      token: "$DEVGUARD_TOKEN"
```

#### Inputs

| Name        | Description                                 | Type   | Default Value        |
|-------------|---------------------------------------------|--------|----------------------|
| `api_url`   | The DevGuard API URL                        | String |       `https://api.main.devguard.org`     |
| `asset_name`| Name of the asset to scan                   | String |              |
| `token`     | API token for authenticating with DevGuard  | String |              |

### devguard-container-scanning

The `devguard-container-scanning` component scans your container images for vulnerabilities. This ensures that your Docker images do not contain known vulnerabilities before they are deployed. To use this component, you need to have a `Dockerfile` in your repository's root directory.

#### Usage Example

```yaml
  - component: $CI_SERVER_FQDN/$CI_PROJECT_PATH/container-scanning@$CI_COMMIT_SHA
    inputs:
      asset_name: "$DEVGUARD_ASSET_NAME"
      token: "$DEVGUARD_TOKEN"

```

#### Inputs

| Name        | Description                                  | Default Value        |
|-------------|----------------------------------------------|----------------------|
| `api_url`   | The DevGuard API URL                         |       `https://api.main.devguard.org`     |
| `asset_name`| Name of the asset to scan                    |              |
| `token`     | API token for authenticating with DevGuard   |              |


## Contributing

We welcome contributions to DevGuard! If you would like to contribute, please refer to our [contribution guidelines](https://github.com/l3montree-dev/devguard/blob/main/CONTRIBUTING.md) for more information.