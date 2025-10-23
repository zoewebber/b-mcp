import { CreateProjectInput, CreateProjectInputSchema, ProjectResponse } from '../../../types/api/projects.js';
import type { ApiClient } from '../client.js';
import { preparePath } from '../utils/preparePath.js';

export class ProjectsApi {
  constructor(private client: ApiClient) {}

  async create(pathParams: { workspace: string }, projectData: CreateProjectInput): Promise<ProjectResponse> {
    const validatedData = CreateProjectInputSchema.parse(projectData);

    return this.client.request<ProjectResponse>(preparePath('/workspaces/:workspace/projects', pathParams), {
      method: 'POST',
      body: validatedData,
    });
  }

  async get(pathParams: { workspace: string; project: string }): Promise<ProjectResponse> {
    return this.client.request<ProjectResponse>(
      preparePath('/workspaces/:workspace/projects/:project', pathParams)
    );
  }
}