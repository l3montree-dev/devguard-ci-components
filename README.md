# Vulnerability Scanning with DevGuard CI/CD Components

DevGuard simplifies vulnerability management for developers by integrating key security practices directly into the CI/CD workflow. With DevGuard, you can seamlessly perform tasks such as Software Composition Analysis (SCA) and Container Scanning, ensuring that vulnerabilities are detected and addressed early in your pipeline.

You can see how DevGuard works in practice [here](https://main.devguard.org/l3montree-cybersecurity/projects/devguard-pipeline/assets/devguard-pipeline), where this repository is scanned using the same components.

Read more about DevGuard and its features [here](https://github.com/l3montree-dev/devguard).


## DevGuard Components

Below are the DevGuard components available for use in your CI/CD pipeline. Each component addresses specific security needs and is configurable with simple YAML snippets.

### devguard:full
The `devguard:full` component combines all of the listed components beneath (Software Composition Analysis, Container Scanning, and Deployment) into a single unified DevSecOps pipeline. This allows you to implement a comprehensive security workflow with minimal configuration.


#### Usage Example
```yaml
include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/full@~latest
    inputs:
      asset_name: "$DEVGUARD_ASSET_NAME"
      token: "$DEVGUARD_TOKEN"
```
### devguard:secret-scanning:
The `devguard:secret-scanning` component is designed to identify sensitive information such as API keys, passwords, and other secrets within your codebase. By integrating secret scanning into your CI/CD pipeline, developers can proactively prevent the accidental exposure of confidential data, enhancing the overall security posture of the application.


#### Usage Example

```yaml
include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/secret-scanning@~latest
    inputs:
      scan_stage: "devguard-secret-scanning"
      runner_tags: "deployment, production"
```

#### Inputs

| Name        | Description                                  | Default Value        |
|-------------|----------------------------------------------|----------------------|
| `scan_stage`| The stage where the scan is run              |     `test`     |
| `runner_tags` | The runner tags used to select appropriate CI runners. | `` |


### devguard:Static Application Security Testing
The `devguard:sast` component focuses on Static Application Security Testing (SAST) to analyze your source code for vulnerabilities without executing it. This component helps in identifying security flaws early in the development cycle, ensuring that code quality and security are prioritized before deployment. 

#### Usage Example

```yaml
include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/sast@~latest
    inputs:
      scan_stage: "devguard-sast"   
      runner_tags: "deployment, production"
```

#### Inputs

| Name        | Description                                  | Default Value        |
|-------------|----------------------------------------------|----------------------|
| `scan_stage`| The stage where the scan is run              |     `test`     |
| `runner_tags` | The runner tags used to select appropriate CI runners. | `` |



### devguard:software-composition-analysis

The `devguard:software-composition-analysis` component performs Software Composition Analysis (SCA) to detect vulnerabilities in your project’s dependencies. It scans your software for outdated or vulnerable third-party libraries, helping you manage risks early in the development process.

#### Usage Example

```yaml
include:
  - component: $CI_SERVER_FQDN/l3montree/devguard/sca@~latest
    inputs:
      asset_name: "$DEVGUARD_ASSET_NAME"
      token: "$DEVGUARD_TOKEN"
      scan_stage: "devguard-software-composition-analysis"   
      runner_tags: "deployment, production"   
```

#### Inputs

| Name        | Description                                  | Default Value        |
|-------------|----------------------------------------------|----------------------|
| `api_url`   | The DevGuard API URL                         |       `https://api.main.devguard.org`     |
| `asset_name`| Name of the asset to scan                    |              |
| `token`     | API token for authenticating with DevGuard   |               |
| `scan_stage`| The stage where the scan is run              |     `test`     |
| `runner_tags` | The runner tags used to select appropriate CI runners. | `` |


### devguard:container-scanning

The `devguard:container-scanning` component scans your container images for vulnerabilities. This ensures that your Docker images do not contain known vulnerabilities before they are deployed. To use this component, you need to have a `Dockerfile` in your repository's root directory.

#### Usage Example

```yaml
include:
- component: $CI_SERVER_FQDN/l3montree/devguard/container-scanning@~latest
  inputs:
    asset_name: "$DEVGUARD_ASSET_NAME"
    token: "$DEVGUARD_TOKEN"
    runner_tags: "deployment, production"
```


#### Inputs

| Name        | Description                                  | Default Value        |
|-------------|----------------------------------------------|----------------------|
| `api_url`   | The DevGuard API URL                         |       `https://api.main.devguard.org`     |
| `asset_name`| Name of the asset to scan                    |              |
| `token`     | API token for authenticating with DevGuard   |              |
| `build_stage`| The stage where the image is built and tagged            |     `build`     |
| `build_args`| The build arguments to pass to the Kaniko build command'      |     `--context $CI_PROJECT_DIR --dockerfile $CI_PROJECT_DIR/Dockerfile`     |
| `scan_stage`| The stage where the image is scanned             |     `test`     |
| `runner_tags` | The runner tags used to select appropriate CI runners. | `` |


### devguard:deploy

The `devguard:deploy` component can only be used if the `devguard:container-scanning` component is used as well, since this component builds the oci image and stores it as an artifact.

The devguard-deploy component deploys the created OCI (Open Container Initiative) image to the GitLab container registry. This ensures that your images are securely stored and ready for deployment in your infrastructure.

#### Usage Example

```yaml
include:
- component: $CI_SERVER_FQDN/l3montree/devguard/deploy@~latest
  inputs:
    asset_name: "$DEVGUARD_ASSET_NAME"
    token: "$DEVGUARD_TOKEN"
    runner_tags: "deployment, production"
```

#### Inputs

| Name        | Description                                  | Default Value        |
|-------------|----------------------------------------------|----------------------|
| `deploy_stage`| The stage where the image is deployed            |     `deploy`     |
| `runner_tags` | The runner tags used to select appropriate CI runners. | `` |


### devguard:sign

The `devguard:sign` component ensures that your container images are signed for verification purposes, providing an additional layer of security before deployment. This component is essential for organizations that prioritize image integrity and wish to validate their images against tampering.

The devguard component signs the previously built OCI (Open Container Initiative) image using a DevGuard token, helping confirm that the image originates from a trusted source.

#### Usage Example

```yaml
include:
- component: $CI_SERVER_FQDN/l3montree/devguard/sign@~latest
```

#### Inputs

| Name        | Description                                  | Default Value        |
|-------------|----------------------------------------------|----------------------|
| `token`| The DevGuard token         |         |
| `sign_stage`| The stage where the scan is run          |     `deploy`     |
| `runner_tags` | The runner tags used to select appropriate CI runners. | `` |

## Contributing

We welcome contributions to DevGuard! If you would like to contribute, please refer to our [contribution guidelines](https://github.com/l3montree-dev/devguard/blob/main/CONTRIBUTING.md) for more information.