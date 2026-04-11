import { ExportCIComponents, CIComponentGroupTemplate } from "@l3montree/programmatic-ci-components";
import { AttestJobInputs, AttestTemplate } from "./templates/attest";
import { SecretScanningJobInputs, SecretScanningTemplate } from "./templates/secret-scanning";
import { SASTJobInputs, StaticApplicationSecurityTestingTemplate } from "./templates/static-application-security-testing";
import * as fs from "node:fs";
import { IaCJobInputs, InfrastructureAsCodeScanningTemplate } from "./templates/infrastructure-as-code-scanning";
import { SCAJobInputs, SoftwareCompositionAnalysisTemplate } from "./templates/software-composition-analysis";
import { GenerateTagJobInputs, GenerateTagTemplate } from "./templates/generate-tag";
import { BuildOciImageJobInputs, BuildOciImageTemplate } from "./templates/build-oci-image";
import { ContainerScanningJobInputs, ContainerScanningTemplate } from "./templates/container-scanning";
import { PushOciImageJobInputs, PushOciImageTemplate } from "./templates/push-oci-image";
import { SignOciImageJobInputs, SignOciImageTemplate } from "./templates/sign-oci-image";
import { BuildNixExtractScannerTemplate, BuildNixGenerateTagTemplate, BuildNixTemplate } from "./templates/build-nix";
// import { BuildNixMultiArchBuildImageTemplate, BuildNixMultiArchCreateManifestTemplate } from "./templates/build-nix-multiarch";
import { CreateManifestMultiArchTemplate } from "./templates/create-manifest-multi-arch";
import { SarifUploadTemplate } from "./templates/sarif-upload";
import { SbomUploadTemplate } from "./templates/sbom-upload";
import { VexUploadTemplate } from "./templates/vex-upload";
import { DiscoverBaseimageAttestationsTemplate } from "./templates/discover-baseimage-attestations";
import { BuildOciImageWDockerTemplate } from "./templates/build-oci-image-w-docker";
import { ReleaseTemplate } from "./templates/release";
import { Inputs } from "./templates/inputs";
import { SourceProvenanceTemplate } from "./templates/source-provenance-attestation";



// ── full ──────────────────────────────────────────────────────────────────────
const fullGenerateTag = GenerateTagTemplate({ stage: "generate-tag", git_strategy: GenerateTagJobInputs.git_strategy.default });
const fullBuildOciImage = BuildOciImageTemplate({ stage: "build", git_strategy: BuildOciImageJobInputs.git_strategy.default, image: BuildOciImageJobInputs.image.default, image_tag: "$IMAGE_TAG", needs: [ fullGenerateTag.name ], dependencies: [ fullGenerateTag.name ] });
const fullContrainerScannig = ContainerScanningTemplate({ stage: "test", git_strategy: ContainerScanningJobInputs.git_strategy.default, image_tag: "$IMAGE_TAG", needs: [ fullBuildOciImage.name ], dependencies: [ fullBuildOciImage.name ] });
const fullPushOCIImage = PushOciImageTemplate({ stage: "deploy", image: PushOciImageJobInputs.image.default, image_tag: "$IMAGE_TAG", needs: [ fullContrainerScannig.name ], dependencies: [ fullContrainerScannig.name ] });

// ── container-lifecycle ───────────────────────────────────────────────────────
const clGenerateTag       = GenerateTagTemplate({ stage: "oci-image", git_strategy: "fetch" });
const clBuildOciImage     = BuildOciImageTemplate({ stage: "oci-image", git_strategy: "fetch", image: "image.tar", image_tag: "$IMAGE_TAG", needs: [clGenerateTag.name], dependencies: [clGenerateTag.name] });
const clContainerScanning = ContainerScanningTemplate({ stage: "oci-image", git_strategy: "fetch", image_tar_path: "image.tar", needs: [clBuildOciImage.name], dependencies: [clBuildOciImage.name] });
const clPushOciImage      = PushOciImageTemplate({ stage: "oci-image", git_strategy: "none", image: "image.tar", image_tag: "$IMAGE_TAG", needs: [clContainerScanning.name], dependencies: [clContainerScanning.name] });
const clSignOciImage      = SignOciImageTemplate({ stage: "attestation", git_strategy: "none", image: "$IMAGE_TAG", needs: [clGenerateTag.name, clPushOciImage.name], dependencies: [clGenerateTag.name, clPushOciImage.name] });
const clAttest            = AttestTemplate({ stage: "attestation", git_strategy: "none", needs: [clGenerateTag.name, clPushOciImage.name, clBuildOciImage.name, clContainerScanning.name], dependencies: [clGenerateTag.name, clPushOciImage.name, clBuildOciImage.name, clContainerScanning.name] });

// ── container-lifecycle-nix ───────────────────────────────────────────────────
const clnExtractScanner    = BuildNixExtractScannerTemplate({});
const clnGenerateTag       = BuildNixGenerateTagTemplate({ stage: "oci-image", git_strategy: "fetch" });
const clnBuildOciImage     = BuildNixTemplate({ stage: "oci-image", image: "image.tar", needs: [clnGenerateTag.name], dependencies: [clnGenerateTag.name] });
const clnContainerScanning = ContainerScanningTemplate({ stage: "oci-image", git_strategy: "fetch", image_tar_path: "image.tar", needs: [clnGenerateTag.name, clnBuildOciImage.name], dependencies: [clnGenerateTag.name, clnBuildOciImage.name] });
const clnPushOciImage      = PushOciImageTemplate({ stage: "oci-image", git_strategy: "none", image: "image.tar", image_tag: "$IMAGE_TAG", needs: [clnGenerateTag.name, clnBuildOciImage.name, clnContainerScanning.name], dependencies: [clnGenerateTag.name, clnBuildOciImage.name, clnContainerScanning.name] });
const clnSignOciImage      = SignOciImageTemplate({ stage: "attestation", git_strategy: "none", image: "$IMAGE_TAG", needs: [clnGenerateTag.name, clnPushOciImage.name], dependencies: [clnGenerateTag.name, clnPushOciImage.name] });
const clnAttest            = AttestTemplate({ stage: "attestation", git_strategy: "none", needs: [clnGenerateTag.name, clnPushOciImage.name, clnBuildOciImage.name, clnContainerScanning.name], dependencies: [clnGenerateTag.name, clnPushOciImage.name, clnBuildOciImage.name, clnContainerScanning.name] });

// ── push-and-attest ───────────────────────────────────────────────────────────
// build_job_name is an external input — kept as $[[ inputs.build_job_name ]] in job bodies
// and added to the spec via inputOverrides in ExportCIComponents below.
const paGenerateTag   = GenerateTagTemplate({ stage: "oci-image", git_strategy: "fetch" });
const paPushOciImage  = PushOciImageTemplate({ stage: "oci-image", git_strategy: "none", image: "image.tar", image_tag: "$IMAGE_TAG", needs: [paGenerateTag.name, "$[[ inputs.build_job_name ]]"], dependencies: [paGenerateTag.name, "$[[ inputs.build_job_name ]]"] });
const paSignOciImage  = SignOciImageTemplate({ stage: "attestation", git_strategy: "none", image: "$IMAGE_TAG", needs: [paGenerateTag.name, paPushOciImage.name], dependencies: [paGenerateTag.name, paPushOciImage.name] });
const paAttest        = AttestTemplate({ stage: "attestation", git_strategy: "none", needs: [paGenerateTag.name, "$[[ inputs.build_job_name ]]", paPushOciImage.name], dependencies: [paGenerateTag.name, "$[[ inputs.build_job_name ]]", paPushOciImage.name] });

// ── container-scanning-and-attest ─────────────────────────────────────────────
const csaGenerateTag       = GenerateTagTemplate({ stage: "oci-image", git_strategy: "fetch" });
const csaContainerScanning = ContainerScanningTemplate({ stage: "oci-image", git_strategy: "fetch", needs: [csaGenerateTag.name, "$[[ inputs.build_job_name ]]"], dependencies: [csaGenerateTag.name, "$[[ inputs.build_job_name ]]"] });
const csaPushOciImage      = PushOciImageTemplate({ stage: "oci-image", git_strategy: "none", image: "image.tar", image_tag: "$IMAGE_TAG", needs: [csaGenerateTag.name, csaContainerScanning.name, "$[[ inputs.build_job_name ]]"], dependencies: [csaGenerateTag.name, csaContainerScanning.name, "$[[ inputs.build_job_name ]]"] });
const csaSignOciImage      = SignOciImageTemplate({ stage: "attestation", git_strategy: "none", image: "$IMAGE_TAG", needs: [csaGenerateTag.name, csaPushOciImage.name], dependencies: [csaGenerateTag.name, csaPushOciImage.name] });
const csaAttest            = AttestTemplate({ stage: "attestation", git_strategy: "none", needs: [csaGenerateTag.name, "$[[ inputs.build_job_name ]]", csaContainerScanning.name, csaPushOciImage.name], dependencies: [csaGenerateTag.name, "$[[ inputs.build_job_name ]]", csaContainerScanning.name, csaPushOciImage.name] });

// ── container-lifecycle-with-base-image-inspection ────────────────────────────
const clbiDiscoverAttestations = DiscoverBaseimageAttestationsTemplate({ stage: "oci-image", allow_failure: true as any });
const clbiGenerateTag          = GenerateTagTemplate({ stage: "oci-image", git_strategy: "fetch" });
const clbiBuildOciImage        = BuildOciImageTemplate({ stage: "oci-image", git_strategy: "fetch", image: "image.tar", image_tag: "$IMAGE_TAG", needs: [clbiGenerateTag.name], dependencies: [clbiGenerateTag.name] });
const clbiContainerScanning    = ContainerScanningTemplate({ stage: "oci-image", git_strategy: "fetch", image_tar_path: "image.tar", needs: [clbiBuildOciImage.name], dependencies: [clbiBuildOciImage.name] });
const clbiPushOciImage         = PushOciImageTemplate({ stage: "oci-image", git_strategy: "none", image: "image.tar", image_tag: "$IMAGE_TAG", needs: [clbiContainerScanning.name], dependencies: [clbiContainerScanning.name] });
const clbiSignOciImage         = SignOciImageTemplate({ stage: "attestation", git_strategy: "none", image: "$IMAGE_TAG", needs: [clbiGenerateTag.name, clbiPushOciImage.name], dependencies: [clbiGenerateTag.name, clbiPushOciImage.name] });
const clbiAttest               = AttestTemplate({ stage: "attestation", git_strategy: "none", needs: [clbiGenerateTag.name, clbiPushOciImage.name, clbiBuildOciImage.name, clbiContainerScanning.name], dependencies: [clbiGenerateTag.name, clbiPushOciImage.name, clbiBuildOciImage.name, clbiContainerScanning.name] });
// sbom/vex upload depend on discover_baseimage_attestations; file paths use $[[ inputs.output ]] (added via inputOverrides)
const clbiSbomUpload = SbomUploadTemplate({ stage: "attestation", allow_failure: true as any, git_strategy: "none", sbom_file: "$[[ inputs.output ]]/attestation-bom.json", devguard_origin: "BASE_IMAGE_SBOM", needs: [clbiDiscoverAttestations.name], dependencies: [clbiDiscoverAttestations.name] });
const clbiVexUpload  = VexUploadTemplate({ stage: "attestation", allow_failure: true as any, git_strategy: "none", vex_file: "$[[ inputs.output ]]/attestation-vex.json", devguard_origin: "BASE_IMAGE_VEX", needs: [clbiDiscoverAttestations.name, clbiSbomUpload.name], dependencies: [clbiDiscoverAttestations.name, clbiSbomUpload.name] });


const templates: CIComponentGroupTemplate = {
    // ── Individual job templates ──────────────────────────────────────────────
    /*
    "source-provenance-attestation": [
        SourceProvenanceTemplate({}),
    ],
    */
    "attest": [
        AttestTemplate({}),
    ],
    "secret-scanning": [
        SecretScanningTemplate({}),
    ],
    "static-application-security-testing": [
        StaticApplicationSecurityTestingTemplate({})
    ],
    "infrastructure-as-code-scanning": [
        InfrastructureAsCodeScanningTemplate({}),
    ],
    "software-composition-analysis": [
        SoftwareCompositionAnalysisTemplate({}),
    ],
    "generate-tag": [
        GenerateTagTemplate({}),
    ],
    "build-oci-image": [
        BuildOciImageTemplate({}),
    ],
    "build-oci-image-w-docker": [
        BuildOciImageWDockerTemplate({}),
    ],
    "container-scanning": [
        ContainerScanningTemplate({}),
    ],
    "push-oci-image": [
        PushOciImageTemplate({}),
    ],
    "sign-oci-image": [
        SignOciImageTemplate({ }),
    ],
    "build-nix": [
        BuildNixExtractScannerTemplate({}),
        BuildNixGenerateTagTemplate({}),
        BuildNixTemplate({}),
    ],
    /*
    "build-nix-multiarch": [
        BuildNixMultiArchBuildImageTemplate({}),
        BuildNixMultiArchCreateManifestTemplate({}),
    ],*/
    "create-manifest-multi-arch": [
        CreateManifestMultiArchTemplate({}),
    ],
    "sarif-upload": [
        SarifUploadTemplate({}),
    ],
    "sbom-upload": [
        SbomUploadTemplate({}),
    ],
    "vex-upload": [
        VexUploadTemplate({}),
    ],
    "discover-baseimage-attestations": [
        DiscoverBaseimageAttestationsTemplate({}),
    ],
    "release": [
        ReleaseTemplate({}),
    ],

    // ── Orchestration templates ───────────────────────────────────────────────
    "full": [
        SourceProvenanceTemplate({}),
        AttestTemplate({ stage: AttestJobInputs.stage.default }),
        SecretScanningTemplate({ git_strategy: SecretScanningJobInputs.git_strategy.default }),
        StaticApplicationSecurityTestingTemplate({ git_strategy: SASTJobInputs.git_strategy.default }),
        InfrastructureAsCodeScanningTemplate({ git_strategy: IaCJobInputs.git_strategy.default }),
        SoftwareCompositionAnalysisTemplate({ git_strategy: SCAJobInputs.git_strategy.default }),
        fullGenerateTag,
        fullBuildOciImage,
        fullContrainerScannig,
        fullPushOCIImage,
        SignOciImageTemplate({ stage: "deploy", git_strategy: SignOciImageJobInputs.git_strategy.default, image: SignOciImageJobInputs.image.default,  needs: [ fullPushOCIImage.name ], dependencies: [ fullPushOCIImage.name ] }),
    ],
    "container-lifecycle": [
        clGenerateTag, clBuildOciImage, clContainerScanning, clPushOciImage, clSignOciImage, clAttest,
    ],
    "container-lifecycle-nix": [
        clnExtractScanner, clnGenerateTag, clnBuildOciImage, clnContainerScanning, clnPushOciImage, clnSignOciImage, clnAttest,
    ],
    "push-and-attest": [
        paGenerateTag, paPushOciImage, paSignOciImage, paAttest,
    ],
    "container-scanning-and-attest": [
        csaGenerateTag, csaContainerScanning, csaPushOciImage, csaSignOciImage, csaAttest,
    ],
    "container-lifecycle-with-base-image-inspection": [
        clbiDiscoverAttestations,
        clbiGenerateTag, clbiBuildOciImage, clbiContainerScanning, clbiPushOciImage, clbiSignOciImage, clbiAttest,
        clbiSbomUpload, clbiVexUpload,
    ],
}

const header = `# Copyright 2025 l3montree GmbH.
# SPDX-License-Identifier: AGPL-3.0

# This file is automatically generated. Do not edit directly.
`

await ExportCIComponents(templates, header, {
    full: {
        devguard_artifact_name: Inputs.devguard_artifact_name,
    },
    "container-lifecycle-with-base-image-inspection": {
        devguard_artifact_name: Inputs.devguard_artifact_name,
    }
}).then(() => {
    // copy files over using fs
    for (const templateName of Object.keys(templates)) {
        fs.copyFileSync(`../programmatic-ci-components-test-gitlab/templates/${templateName}.yml`, `./templates/${templateName}.yml`)
    }
}).catch((err) => {
    console.error("Error exporting CI components:", err);
    process.exit(1);
});


// console.log("Finished");
