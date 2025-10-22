import { apiRequest, ApiError } from '../api.js';
import { WorkspaceResponse, WorkspacesResponse } from '../../types/api/workspaces.js';


export async function getWorkspaces(token: string): Promise<WorkspacesResponse> {
  return apiRequest<WorkspacesResponse>('/workspaces', { token });
}

export async function getWorkspace(workspaceDomain: string, token: string): Promise<WorkspaceResponse> {
  if (!workspaceDomain) {
    throw new ApiError('Workspace domain is required');
  }

  return apiRequest<WorkspaceResponse>(`/workspaces/${workspaceDomain}`, { token });
}
