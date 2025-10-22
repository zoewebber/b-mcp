import { WorkspaceResponse, WorkspacesResponse } from '../../../types/api/workspaces.js';
import type { ApiClient } from '../client.js';

export class WorkspacesApi {
  constructor(private client: ApiClient) {}

  async list(): Promise<WorkspacesResponse> {
    return this.client.request<WorkspacesResponse>('/workspaces');
  }

  async get(workspaceDomain: string): Promise<WorkspaceResponse> {
    if (!workspaceDomain) {
      throw new Error('Workspace domain is required');
    }

    return this.client.request<WorkspaceResponse>(`/workspaces/${workspaceDomain}`);
  }
}