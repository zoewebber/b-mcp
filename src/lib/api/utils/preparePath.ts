/**
 * Validates path parameters and constructs a URL path from a template
 * @param template - URL template with parameter placeholders (e.g., "/workspaces/:workspace/projects/:project_name")
 * @param pathParams - Object containing path parameter values (using underscore_case names)
 * @returns The constructed path with parameters replaced
 *
 * @example
 * preparePath('/workspaces/:workspace/projects/:project_name', { workspace: 'my-ws', project_name: 'my-proj' })
 * // Returns: '/workspaces/my-ws/projects/my-proj'
 */
export function preparePath(template: string, pathParams: Record<string, unknown>): string {
  // Replace all :param placeholders with actual values
  let path = template;
  for (const [key, value] of Object.entries(pathParams)) {
    path = path.replace(`:${key}`, String(value));
  }

  return path;
}