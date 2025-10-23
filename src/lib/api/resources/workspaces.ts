import { WorkspaceResponse, WorkspacesResponse } from '../../../types/api/workspaces.js';
import type { ApiClient } from '../client.js';
import { preparePath } from '../utils/preparePath.js';

export class WorkspacesApi {
  constructor(private client: ApiClient) {}

  async list(): Promise<WorkspacesResponse> {
    return this.client.request<WorkspacesResponse>('/workspaces');
  }

  async get(pathParams: { workspace: string }): Promise<WorkspaceResponse> {
    return this.client.request<WorkspaceResponse>(
      preparePath('/workspaces/:workspace', pathParams)
    );
  }
}