import { validatePathParams } from './validatePathParams.js';

/**
 * Validates path parameters and constructs a URL path from a template
 * @param template - URL template with parameter placeholders (e.g., "/workspaces/:workspace/projects/:project")
 * @param pathParams - Object containing path parameter values
 * @returns The constructed path with parameters replaced
 *
 * @example
 * preparePath('/workspaces/:workspace/projects/:project', { workspace: 'my-ws', project: 'my-proj' })
 * // Returns: '/workspaces/my-ws/projects/my-proj'
 */
export function preparePath(template: string, pathParams: Record<string, unknown>): string {
  // First validate all params
  validatePathParams(pathParams);

  // Replace all :param placeholders with actual values
  let path = template;
  for (const [key, value] of Object.entries(pathParams)) {
    path = path.replace(`:${key}`, String(value));
  }

  return path;
}