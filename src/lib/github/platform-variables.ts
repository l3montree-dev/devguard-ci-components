/**
 * Map GitLab-style variable values to GitHub Actions syntax.
 *
 * GitLab is the source of truth, so only the GitLab forms are normalized here.
 */
const GITLAB_TO_GITHUB_VARIABLES: Record<string, string> = {
  DEFAULT_BRANCH: "${{ github.event.repository.default_branch }}",
  COMMIT_REF: "${{ github.ref_name }}",
  COMMIT_SHA: "${{ github.sha }}",
  IS_TAG: "${{ github.ref_type == 'tag' }}",
  WORKSPACE_DIR: "/github/workspace",
  $CI_DEFAULT_BRANCH: "${{ github.event.repository.default_branch }}",
  $CI_COMMIT_REF_NAME: "${{ github.ref_name }}",
  $CI_COMMIT_SHA: "${{ github.sha }}",
  $CI_COMMIT_TAG: "${{ github.ref_type == 'tag' }}",
  $CI_PROJECT_DIR: "/github/workspace",
  $CI_REGISTRY: "${{ secrets.REGISTRY_URL }}",
  $CI_REGISTRY_USER: "${{ secrets.REGISTRY_USER }}",
};

/**
 * Map GitLab-style variable values to GitHub Actions syntax.
 */
export function mapVariableToGitHub(varName: string): string {
  return GITLAB_TO_GITHUB_VARIABLES[varName] || varName;
}
