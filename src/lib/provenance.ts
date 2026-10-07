// Name of the variable holding the OIDC workload identity token of the job, issued for the DevGuard API as audience.
export const DEVGUARD_ID_TOKEN = "DEVGUARD_ID_TOKEN";

type SignBuildProvenanceOptions = {
  // command to run the devguard-scanner, e.g. "/devguard-scanner"
  scanner: string;
  // command to run jq, e.g. "jq"
  jq: string;
  // shell expression for the name of the built image - the digest is read from image-digest.txt
  image: string;
  devguardToken: string;
  devguardApiUrl: string;
  devguardAssetName: string;
};

/**
 * Lets DevGuard sign build.provenance.json with the verified workload identity of the job ($DEVGUARD_ID_TOKEN).
 * Before signing, the subject is set to the built image, so the provenance can be matched to it by digest.
 * The signed DSSE envelope replaces build.provenance.json - 'devguard-scanner attest' attaches it without signing it again.
 * If DevGuard can not sign it, the unsigned provenance is kept and signed with the DevGuard token during attestation.
 */
export const signBuildProvenanceScript = (options: SignBuildProvenanceOptions) => `if [ -f build.provenance.json ] \\
  && ${options.jq} --arg name "${options.image}" --arg digest "$(cut -d: -f2 image-digest.txt)" '.subject = [{"name": $name, "digest": {"sha256": $digest}}]' build.provenance.json > build.provenance.unsigned.json \\
  && ${options.scanner} provenance sign build.provenance.unsigned.json --token="${options.devguardToken}" --apiUrl="${options.devguardApiUrl}" --assetName="${options.devguardAssetName}" > build.provenance.signed.json; then
  mv build.provenance.signed.json build.provenance.json
  echo "DevGuard signed the build provenance with the workload identity of this job"
else
  echo "WARNING: DevGuard could not sign the build provenance. Keeping the unsigned provenance - it is signed with the DevGuard token during attestation instead."
fi
rm -f build.provenance.unsigned.json build.provenance.signed.json`;

/**
 * Requests the OIDC token of the GitHub Actions job for the DevGuard API and exports it as $DEVGUARD_ID_TOKEN.
 * Only available if the calling workflow grants 'id-token: write' - the reusable workflows do not request it themselves,
 * since that would break every caller which does not grant it.
 */
export const requestGitHubIdTokenScript = (devguardApiUrl: string) => `if [ -n "$ACTIONS_ID_TOKEN_REQUEST_URL" ]; then
  ${DEVGUARD_ID_TOKEN}=$(curl -sSfG --data-urlencode "audience=${devguardApiUrl}" -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" "$ACTIONS_ID_TOKEN_REQUEST_URL" | jq -r .value) || ${DEVGUARD_ID_TOKEN}=""
  export ${DEVGUARD_ID_TOKEN}
else
  echo "No OIDC token available. Grant 'id-token: write' in your workflow to let DevGuard sign the build provenance with the identity of this job."
fi`;
