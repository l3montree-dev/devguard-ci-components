# Generate YML templates from Code

```bash
npm run generate
```

# Check diff between generated version and latest main

```bash
go install github.com/homeport/dyff/cmd/dyff@latest

dyff between https://gitlab.opencode.de/l3montree/devguard-ci-components/-/raw/main/templates/attest.yml templates/attest.yml (OK)
# TODO (also why is it using remotes as triggers...?) dyff between https://gitlab.opencode.de/l3montree/devguard-ci-components/-/raw/main/templates/build-nix-multiarch.yml templates/build-nix-multiarch.yml
dyff between https://gitlab.opencode.de/l3montree/devguard-ci-components/-/raw/main/templates/build-nix.yml templates/build-nix.yml (OK)
dyff between https://gitlab.opencode.de/l3montree/devguard-ci-components/-/raw/main/templates/build-oci-image-w-docker.yml templates/build-oci-image-w-docker.yml (OK)
dyff between https://gitlab.opencode.de/l3montree/devguard-ci-components/-/raw/main/templates/build-oci-image.yml templates/build-oci-image.yml (OK)
dyff between https://gitlab.opencode.de/l3montree/devguard-ci-components/-/raw/main/templates/container-scanning.yml templates/container-scanning.yml (OK)
# TODO.. dyff between https://gitlab.opencode.de/l3montree/devguard-ci-components/-/raw/main/templates/create-manifest-multi-arch.yml templates/create-manifest-multi-arch.yml
dyff between https://gitlab.opencode.de/l3montree/devguard-ci-components/-/raw/main/templates/discover-baseimage-attestations.yml templates/discover-baseimage-attestations.yml (OK)
# TODO.. dyff between https://gitlab.opencode.de/l3montree/devguard-ci-components/-/raw/main/templates/full.yml templates/full.yml
dyff between https://gitlab.opencode.de/l3montree/devguard-ci-components/-/raw/main/templates/generate-tag.yml templates/generate-tag.yml (OK)
dyff between https://gitlab.opencode.de/l3montree/devguard-ci-components/-/raw/main/templates/infrastructure-as-code-scanning.yml templates/infrastructure-as-code-scanning.yml (OK)
# TODO.. dyff between https://gitlab.opencode.de/l3montree/devguard-ci-components/-/raw/main/templates/push-and-attest.yml templates/push-and-attest.yml
dyff between https://gitlab.opencode.de/l3montree/devguard-ci-components/-/raw/main/templates/push-oci-image.yml templates/push-oci-image.yml (OK)
dyff between https://gitlab.opencode.de/l3montree/devguard-ci-components/-/raw/main/templates/release.yml templates/release.yml (OK)
dyff between https://gitlab.opencode.de/l3montree/devguard-ci-components/-/raw/main/templates/sarif-upload.yml templates/sarif-upload.yml (OK)
dyff between https://gitlab.opencode.de/l3montree/devguard-ci-components/-/raw/main/templates/sbom-upload.yml templates/sbom-upload.yml (OK)
dyff between https://gitlab.opencode.de/l3montree/devguard-ci-components/-/raw/main/templates/secret-scanning.yml templates/secret-scanning.yml (OK)
dyff between https://gitlab.opencode.de/l3montree/devguard-ci-components/-/raw/main/templates/sign-oci-image.yml templates/sign-oci-image.yml (OK)
dyff between https://gitlab.opencode.de/l3montree/devguard-ci-components/-/raw/main/templates/software-composition-analysis.yml templates/software-composition-analysis.yml (OK)
dyff between https://gitlab.opencode.de/l3montree/devguard-ci-components/-/raw/main/templates/static-application-security-testing.yml templates/static-application-security-testing.yml (OK)
dyff between https://gitlab.opencode.de/l3montree/devguard-ci-components/-/raw/main/templates/vex-upload.yml templates/vex-upload.yml (OK)



TODO check if generate-tag data is used in all jobs as image tag...? (description of push-oci-image)
TODO check if release.yml really needs input override or if we can change the description for all occurences
TODO check if default devguard_artifact_name can be adjusted
TODO consider changing default description for "needs" and "dependencies"
```
