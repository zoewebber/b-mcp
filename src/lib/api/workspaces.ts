import { z } from 'zod';
import { apiRequest, ApiResult, ApiError } from '../api.js';

export const WorkspaceResponseSchema = z.object({
  url: z.url(),
  html_url: z.url(),
  id: z.number(),
  name: z.string(),
  domain: z.string(),
});

export const WorkspacesResponseSchema = z.object({
  url: z.url(),
  html_url: z.url(),
  workspaces: WorkspaceResponseSchema.array(),
});

export type WorkspaceResponse = z.infer<typeof WorkspaceResponseSchema>;

export type WorkspacesResponse = z.infer<typeof WorkspacesResponseSchema>;

export async function getWorkspaces(token?: string): Promise<ApiResult<WorkspacesResponse>> {
  const [response, error] = await apiRequest<WorkspacesResponse>('/workspaces', { token });

  if (error) {
    return [null, error];
  }

  return [response as WorkspacesResponse, null];
}

export async function getWorkspace(workspaceDomain: string, token?: string): Promise<ApiResult<WorkspaceResponse>> {
  if (!workspaceDomain) {
    return [null, new ApiError('Workspace domain is required')];
  }

  const [response, error] = await apiRequest<WorkspaceResponse>(`/workspaces/${workspaceDomain}`, { token });

  if (error) {
    return [null, error];
  }

  return [response as WorkspaceResponse, null];
}
