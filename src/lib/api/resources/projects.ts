import { CreateProjectInput, CreateProjectInputSchema, ProjectResponse } from '../../../types/api/projects.js';
import type { ApiClient } from '../client.js';
import { preparePath } from '../utils/preparePath.js';
import { validateParams } from '../utils/validateParams.js';

export class ProjectsApi {
  constructor(private client: ApiClient) {}

  async create(params: { workspace: string }, projectData: CreateProjectInput): Promise<ProjectResponse> {
    validateParams(params, ['workspace']);
    const validatedData = CreateProjectInputSchema.parse(projectData);

    return this.client.request<ProjectResponse>(preparePath('/workspaces/:workspace/projects', params), {
      method: 'POST',
      body: validatedData,
    });
  }

  async get(params: { workspace: string; project_name: string }): Promise<ProjectResponse> {
    validateParams(params, ['workspace', 'project_name']);

    return this.client.request<ProjectResponse>(
      preparePath('/workspaces/:workspace/projects/:project_name', params)
    );
  }
}