// The API routes need "org/projects/<project>/assets/<asset>", while the scanner also accepts the short
// "org/project/asset" form. Expands the short form at runtime and leaves the long form untouched.
export const assetApiPath = (assetName: string) =>
  `$(echo "${assetName}" | sed -E 's#^([^/]+)/([^/]+)/([^/]+)$#\\1/projects/\\2/assets/\\3#')`;

// The ref segment of API urls (".../refs/<ref>/..."): DevGuard (>= v1.19.2) resolves it as the slug of the asset version
// or as its name encoded as a url path segment ("feature/foo" -> "feature%2Ffoo"). The scanner has no slug command
// anymore. quotedRef is a shell word with its quotes, e.g. "\"$CI_COMMIT_REF_NAME\"". Needs jq.
export const apiRefPath = (quotedRef: string) => `$(jq -rn --arg ref ${quotedRef} '$ref | @uri')`;

// Same expansion applied to a full API url, for urls which are passed in as a whole (e.g. attestation sources).
export const ASSET_API_URL_SED = `sed -E 's#/organizations/([^/]+)/([^/]+)/([^/]+)/refs/#/organizations/\\1/projects/\\2/assets/\\3/refs/#'`;
