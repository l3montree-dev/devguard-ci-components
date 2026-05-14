import { defineInputs, defineJob } from "../lib/JobWithSpecBuilder";
import { Inputs } from "./inputs"
import { ContainerImages } from "../container-image-versions";


export const BuildOciImageWDockerJobInputs = defineInputs({
    devguard_api_url: Inputs.devguard_api_url,
    devguard_asset_name: Inputs.devguard_asset_name,
    devguard_token: Inputs.devguard_token,

    docker_buildkit: Inputs.docker_buildkit,

    runner_tags: Inputs.runner_tags,
    stage: {
        ...Inputs.stage,
        default: "oci-image" as const,
    },
    job_suffix: Inputs.job_suffix,
    git_strategy: {
        ...Inputs.git_strategy,
        default: "fetch" as const,
    },
    pull_policy: Inputs.pull_policy,
    allow_failure: Inputs.allow_failure,
    needs: Inputs.needs,
    dependencies: Inputs.dependencies,

    registry: Inputs.registry,
    registry_user: Inputs.registry_user,
    registry_password: Inputs.registry_password,

    image: {
        ...Inputs.image,
        description: "The image file to build (e.g. image.tar)" as const,
        default: "image.tar" as const,
    },
    image_tag: Inputs.image_tag,
    build_args: Inputs.build_args,
    push_image: Inputs.push_image,
    supplyChainId: Inputs.supplyChainId,

    default_ref: Inputs.default_ref,
    ref: Inputs.commit_ref,
    is_tag: Inputs.is_tag,
});

export const BuildOciImageWDockerTemplate = defineJob(BuildOciImageWDockerJobInputs, (inputValues) => ({
    name: `devguard:build_oci_image${inputValues.job_suffix}`,
    job: {
        tags: inputValues.runner_tags as any,
        stage: inputValues.stage,
        allow_failure: inputValues.allow_failure as any,
        needs: inputValues.needs as any,
        dependencies: inputValues.dependencies as any,
        variables: {
            GIT_STRATEGY: inputValues.git_strategy,
            DOCKER_BUILDKIT: inputValues.docker_buildkit,
            DOCKER_HOST: "tcp://127.0.0.1:2375",
            DOCKER_TLS_CERTDIR: "",
        },
        services: [
            {
                name: ContainerImages.DOCKER_KRANE,
                entrypoint: ["/bin/sh", "-c"],
                command: [
                    `if [[ $(df -PT /var/lib/docker | awk 'NR==2 {print $2}') == virtiofs ]]; then\n  apk add e2fsprogs && \\\n  truncate -s 20G /tmp/disk.img && \\\n  mkfs.ext4 /tmp/disk.img && \\\n  mount /tmp/disk.img /var/lib/docker; fi && \\\n  dockerd-entrypoint.sh;`,
                ],
                variables: {
                    HEALTHCHECK_TCP_PORT: "2375",
                },
            },
        ] as any,
        image: {
            name: ContainerImages.DOCKER_KRANE,
            pull_policy: inputValues.pull_policy as any,
            entrypoint: [""],
        },
        before_script: [
            `echo "Uses Docker DIND to build Docker images inside a secured kata container.\\n The artifacts are not pushed to the registry until they have undergone security scanning to ensure vulnerabilities are addressed before deployment - therefore they are stored as artifacts rather than pushed to the registry."`,
            `/devguard-scanner intoto start --step=build --token="${inputValues.devguard_token}" --apiUrl="${inputValues.devguard_api_url}" --assetName="${inputValues.devguard_asset_name}" --supplyChainId="${inputValues.supplyChainId}"`,
        ],
        script: [
            `echo "$CI_JOB_TOKEN" | docker login $CI_REGISTRY -u gitlab-ci-token --password-stdin`,
            `/crane auth login -u ${inputValues.registry_user} -p ${inputValues.registry_password} ${inputValues.registry}`,
            `docker buildx build --output type=docker,dest=./${inputValues.image} -t ${inputValues.image_tag} ${inputValues.build_args}`,
            `if [[ "${inputValues.push_image}" == "true" ]]; then docker load -i ./${inputValues.image} && docker push ${inputValues.image_tag}; fi`,
            `/crane auth login -u ${inputValues.registry_user} -p ${inputValues.registry_password} ${inputValues.registry}`,
            `/crane digest $([[ "${inputValues.push_image}" == "false" ]] && echo "--tarball=${inputValues.image}" || echo "${inputValues.image_tag}" ) > image-digest.txt`,
            `echo "Running DevGuard Intoto Build...stopping..."`,
            `/devguard-scanner intoto stop --step=build --products=image-digest.txt --token="${inputValues.devguard_token}" --apiUrl="${inputValues.devguard_api_url}" --assetName="${inputValues.devguard_asset_name}" --supplyChainId="${inputValues.supplyChainId}" --generateSlsaProvenance --defaultRef="${inputValues.default_ref}" --ref="${inputValues.ref}" --isTag="${inputValues.is_tag}"`,
            `echo "IMAGE_TAG=${inputValues.image_tag}@$(cat image-digest.txt)" > variables.env`,
        ],
        artifacts: {
            paths: [
                inputValues.image,
                "image-digest.txt",
                "build.provenance.json",
                "variables.env",
            ],
            reports: {
                dotenv: "variables.env",
            },
            when: "on_success",
        }
    }
}));
