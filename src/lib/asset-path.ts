// The API routes need "org/projects/<project>/assets/<asset>", while the scanner also accepts the short
// "org/project/asset" form. Expands the short form at runtime and leaves the long form untouched.
export const assetApiPath = (assetName: string) =>
  `$(echo "${assetName}" | sed -E 's#^([^/]+)/([^/]+)/([^/]+)$#\\1/projects/\\2/assets/\\3#')`;

// Same expansion applied to a full API url, for urls which are passed in as a whole (e.g. attestation sources).
export const ASSET_API_URL_SED = `sed -E 's#/organizations/([^/]+)/([^/]+)/([^/]+)/refs/#/organizations/\\1/projects/\\2/assets/\\3/refs/#'`;
