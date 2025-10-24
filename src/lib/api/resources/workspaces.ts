import { WorkspaceResponse, WorkspacesResponse } from '../../../types/api/workspaces.js';
import type { ApiClient } from '../client.js';
import { preparePath } from '../utils/preparePath.js';
import { validateParams } from '../utils/validateParams.js';

export class WorkspacesApi {
  constructor(private client: ApiClient) {}

  async list(): Promise<WorkspacesResponse> {
    return this.client.request<WorkspacesResponse>('/workspaces');
  }

  async get(params: { workspace: string }): Promise<WorkspaceResponse> {
    validateParams(params, ['workspace']);

    return this.client.request<WorkspaceResponse>(
      preparePath('/workspaces/:workspace', params)
    );
  }
}