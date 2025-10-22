import { apiRequest, ApiError } from '../api.js';
import logger from '../logger.js';
import { to } from '../to.js';
import sleep from '../sleep.js';
import { CommitResponse, CreateProjectInput, CreateProjectInputSchema, ProjectResponse } from '../../types/api/projects.js';


export async function createProject(workspaceDomain: string, projectData: CreateProjectInput, token: string): Promise<ProjectResponse> {
  const validatedData = CreateProjectInputSchema.parse(projectData);

  return apiRequest<ProjectResponse>(`/workspaces/${workspaceDomain}/projects`, {
    method: 'POST',
    body: validatedData,
    token
  });
}

export async function getProject(workspaceDomain: string, projectName: string, token: string): Promise<ProjectResponse> {
  if (!workspaceDomain) {
    throw new Error('Workspace is required');
  }

  if (!projectName) {
    throw new Error('Project name is required');
  }

  return apiRequest<ProjectResponse>(`/workspaces/${workspaceDomain}/projects/${projectName}`, { token });
}

export async function getCommit(workspaceDomain: string, projectName: string, revision: string, token: string): Promise<CommitResponse> {
  if (!workspaceDomain) {
    throw new Error('Workspace is required');
  }

  if (!projectName) {
    throw new Error('Project name is required');
  }

  if (!revision) {
    throw new ApiError('Revision is required');
  }

  return apiRequest<CommitResponse>(`/workspaces/${workspaceDomain}/projects/${projectName}/repository/commits/${revision}`, { token });
}

/**
 * Wait until a commit is detected in the Buddy repository
 * Will poll the API with exponential backoff until the commit is found or timeout is reached
 */
export async function waitForCommitToBePushed(
  workspaceDomain: string,
  projectName: string,
  revision: string,
  token: string,
  maxAttempts: number = 10,
  initialDelayMs: number = 1000,
  maxDelayMs: number = 10000,
): Promise<CommitResponse> {
  if (!workspaceDomain) {
    throw new Error('Workspace domain is required');
  }

  if (!projectName) {
    throw new Error('Project name is required');
  }

  if (!revision) {
    throw new ApiError('Revision is required');
  }

  let attempts = 0;
  let delay = initialDelayMs;

  while (attempts < maxAttempts) {
    attempts++;

    // Check if the commit exists
    const [commit, error] = await to(getCommit(workspaceDomain, projectName, revision, token));

    // If found, return it
    if (commit && !error) {
      return commit;
    }

    // If error is not 404 (not found), return the error
    if (error && (error as ApiError)?.statusCode !== 404) {
      throw error;
    }

    logger.info(`Commit ${revision.substring(0, 8)} not yet found in Buddy repository. Attempt ${attempts}/${maxAttempts}, waiting ${delay}ms before next check...`);

    await sleep(delay);

    // Exponential backoff with max limit
    delay = Math.min(delay * 2, maxDelayMs);
  }

  throw new Error(`Timeout reached: Commit ${revision} was not found in repository after ${maxAttempts} attempts`);
}