import { AttestJobInputs, AttestJobInputsGitHub, AttestTemplate, AttestTemplateGitHub } from "./attest";
import { BuildNixGenerateTagJobInputs, BuildNixGenerateTagTemplate, BuildNixJobInputs, BuildNixJobInputsGitHub, BuildNixTemplate, BuildNixTemplateGitHub } from "./build-nix";
import { BuildNixMultiArchBuildImageTemplate, BuildNixMultiArchBuildImageTemplateGitHub, BuildNixMultiArchCreateManifestTemplate, BuildNixMultiArchCreateManifestTemplateGitHub, BuildNixMultiArchJobInputs, BuildNixMultiArchJobInputsGitHub } from "./build-nix-multiarch";
import { BuildOciImageJobInputs, BuildOciImageJobInputsGitHub, BuildOciImageTemplate, BuildOciImageTemplateGitHub } from "./build-oci-image";
import { BuildOciImageWDockerJobInputs, BuildOciImageWDockerJobInputsGitHub, BuildOciImageWDockerTemplate, BuildOciImageWDockerTemplateGitHub } from "./build-oci-image-w-docker";
import { ContainerScanningJobInputs, ContainerScanningJobInputsGitHub, ContainerScanningTemplate, ContainerScanningTemplateGitHub } from "./container-scanning";
import { CreateManifestMultiArchJobInputs, CreateManifestMultiArchJobInputsGitHub, CreateManifestMultiArchTemplate, CreateManifestMultiArchTemplateGitHub } from "./create-manifest-multi-arch";
import { DeployJobInputsGitHub, DeployJobInputsGitLab, DeployTemplateGitHub, DeployTemplateGitLab } from "./deploy";
import { DiscoverBaseimageAttestationsJobInputs, DiscoverBaseimageAttestationsJobInputsGitHub, DiscoverBaseimageAttestationsTemplate, DiscoverBaseimageAttestationsTemplateGitHub } from "./discover-baseimage-attestations";
import { GenerateTagJobInputs, GenerateTagJobInputsGitHub, GenerateTagTemplate, GenerateTagTemplateGitHub } from "./generate-tag";
import { IaCJobInputs, IaCJobInputsGitHub, InfrastructureAsCodeScanningTemplate, InfrastructureAsCodeScanningTemplateGitHub } from "./infrastructure-as-code-scanning";
import { PushOciImageJobInputs, PushOciImageJobInputsGitHub, PushOciImageTemplate, PushOciImageTemplateGitHub } from "./push-oci-image";
import { ReleaseJobInputs, ReleaseJobInputsGitHub, ReleaseTemplate, ReleaseTemplateGitHub } from "./release";
import { SarifUploadJobInputs, SarifUploadJobInputsGitHub, SarifUploadTemplate, SarifUploadTemplateGitHub } from "./sarif-upload";
import { SbomUploadJobInputs, SbomUploadJobInputsGitHub, SbomUploadTemplate, SbomUploadTemplateGitHub } from "./sbom-upload";
import { SecretScanningJobInputsGitHub, SecretScanningJobInputsGitLab, SecretScanningTemplateGitHub, SecretScanningTemplateGitLab } from "./secret-scanning";
import { SignJobInputsGitHub, SignOciImageJobInputs, SignOciImageTemplate, SignTemplateGitHub } from "./sign-oci-image";
import { SCAJobInputs, SCAJobInputsGitHub, SoftwareCompositionAnalysisTemplate, SoftwareCompositionAnalysisTemplateGitHub } from "./software-composition-analysis";
import { SASTJobInputs, SASTJobInputsGitHub, StaticApplicationSecurityTestingTemplate, StaticApplicationSecurityTestingTemplateGitHub } from "./static-application-security-testing";
import { VexUploadJobInputs, VexUploadJobInputsGitHub, VexUploadTemplate, VexUploadTemplateGitHub } from "./vex-upload";
import { ZizmorScanningJobInputsGitHub, ZizmorScanningTemplateGitHub } from "./zizmor-scanning";

type TemplateEntry = [name: string, factory: (inputs: any) => unknown, inputDefs: Record<string, unknown>];

export const templates: { gitlab: TemplateEntry[]; github: TemplateEntry[] } = {
  gitlab: [
    ["AttestTemplate", AttestTemplate, AttestJobInputs],
    ["BuildNixTemplate", BuildNixTemplate, BuildNixJobInputs],
    ["BuildNixGenerateTagTemplate", BuildNixGenerateTagTemplate, BuildNixGenerateTagJobInputs],
    ["BuildNixMultiArchBuildImageTemplate", BuildNixMultiArchBuildImageTemplate, BuildNixMultiArchJobInputs],
    ["BuildNixMultiArchCreateManifestTemplate", BuildNixMultiArchCreateManifestTemplate, BuildNixMultiArchJobInputs],
    ["BuildOciImageTemplate", BuildOciImageTemplate, BuildOciImageJobInputs],
    ["BuildOciImageWDockerTemplate", BuildOciImageWDockerTemplate, BuildOciImageWDockerJobInputs],
    ["ContainerScanningTemplate", ContainerScanningTemplate, ContainerScanningJobInputs],
    ["CreateManifestMultiArchTemplate", CreateManifestMultiArchTemplate, CreateManifestMultiArchJobInputs],
    ["DeployTemplateGitLab", DeployTemplateGitLab, DeployJobInputsGitLab],
    ["DiscoverBaseimageAttestationsTemplate", DiscoverBaseimageAttestationsTemplate, DiscoverBaseimageAttestationsJobInputs],
    ["GenerateTagTemplate", GenerateTagTemplate, GenerateTagJobInputs],
    ["InfrastructureAsCodeScanningTemplate", InfrastructureAsCodeScanningTemplate, IaCJobInputs],
    ["PushOciImageTemplate", PushOciImageTemplate, PushOciImageJobInputs],
    ["ReleaseTemplate", ReleaseTemplate, ReleaseJobInputs],
    ["SarifUploadTemplate", SarifUploadTemplate, SarifUploadJobInputs],
    ["SbomUploadTemplate", SbomUploadTemplate, SbomUploadJobInputs],
    ["SecretScanningTemplateGitLab", SecretScanningTemplateGitLab, SecretScanningJobInputsGitLab],
    ["SignOciImageTemplate", SignOciImageTemplate, SignOciImageJobInputs],
    ["SoftwareCompositionAnalysisTemplate", SoftwareCompositionAnalysisTemplate, SCAJobInputs],
    ["StaticApplicationSecurityTestingTemplate", StaticApplicationSecurityTestingTemplate, SASTJobInputs],
    ["VexUploadTemplate", VexUploadTemplate, VexUploadJobInputs],
  ],
  github: [
    ["AttestTemplateGitHub", AttestTemplateGitHub, AttestJobInputsGitHub],
    ["BuildNixMultiArchBuildImageTemplateGitHub", BuildNixMultiArchBuildImageTemplateGitHub, BuildNixMultiArchJobInputsGitHub],
    ["BuildNixMultiArchCreateManifestTemplateGitHub", BuildNixMultiArchCreateManifestTemplateGitHub, BuildNixMultiArchJobInputsGitHub],
    ["BuildNixTemplateGitHub", BuildNixTemplateGitHub, BuildNixJobInputsGitHub],
    ["BuildOciImageTemplateGitHub", BuildOciImageTemplateGitHub, BuildOciImageJobInputsGitHub],
    ["BuildOciImageWDockerTemplateGitHub", BuildOciImageWDockerTemplateGitHub, BuildOciImageWDockerJobInputsGitHub],
    ["ContainerScanningTemplateGitHub", ContainerScanningTemplateGitHub, ContainerScanningJobInputsGitHub],
    ["CreateManifestMultiArchTemplateGitHub", CreateManifestMultiArchTemplateGitHub, CreateManifestMultiArchJobInputsGitHub],
    ["DeployTemplateGitHub", DeployTemplateGitHub, DeployJobInputsGitHub],
    ["DiscoverBaseimageAttestationsTemplateGitHub", DiscoverBaseimageAttestationsTemplateGitHub, DiscoverBaseimageAttestationsJobInputsGitHub],
    ["GenerateTagTemplateGitHub", GenerateTagTemplateGitHub, GenerateTagJobInputsGitHub],
    ["InfrastructureAsCodeScanningTemplateGitHub", InfrastructureAsCodeScanningTemplateGitHub, IaCJobInputsGitHub],
    ["PushOciImageTemplateGitHub", PushOciImageTemplateGitHub, PushOciImageJobInputsGitHub],
    ["ReleaseTemplateGitHub", ReleaseTemplateGitHub, ReleaseJobInputsGitHub],
    ["SarifUploadTemplateGitHub", SarifUploadTemplateGitHub, SarifUploadJobInputsGitHub],
    ["SbomUploadTemplateGitHub", SbomUploadTemplateGitHub, SbomUploadJobInputsGitHub],
    ["SecretScanningTemplateGitHub", SecretScanningTemplateGitHub, SecretScanningJobInputsGitHub],
    ["SignTemplateGitHub", (inputs: any) => SignTemplateGitHub({ image: "image.tar", ...inputs }), SignJobInputsGitHub],
    ["SoftwareCompositionAnalysisTemplateGitHub", SoftwareCompositionAnalysisTemplateGitHub, SCAJobInputsGitHub],
    ["StaticApplicationSecurityTestingTemplateGitHub", StaticApplicationSecurityTestingTemplateGitHub, SASTJobInputsGitHub],
    ["VexUploadTemplateGitHub", VexUploadTemplateGitHub, VexUploadJobInputsGitHub],
    ["ZizmorScanningTemplateGitHub", ZizmorScanningTemplateGitHub, ZizmorScanningJobInputsGitHub],
  ],
};
