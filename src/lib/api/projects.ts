import { z } from 'zod';
import { apiRequest, ApiResult, ApiError } from '../api.js';
import logger from '../logger.js';

// Input schema for creating a project
export const CreateProjectInputSchema = z.object({
  name: z.string().optional(),
  display_name: z.string(),
  access: z.enum(['PUBLIC', 'PRIVATE']).default('PRIVATE').optional(),
  fetch_submodules: z.boolean().default(false).optional(),
  fetch_submodules_env_key: z.string().optional(),
  allow_pull_requests: z.boolean().default(true).optional(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;

// User schema for API responses
export const UserSchema = z.object({
  url: z.url(),
  html_url: z.url(),
  id: z.number(),
  name: z.string(),
  avatar_url: z.url()
});

// Response schema for created project
export const ProjectResponseSchema = z.object({
  url: z.url(),
  html_url: z.url(),
  name: z.string(),
  display_name: z.string().optional(),
  status: z.string(),
  create_date: z.string().datetime(),
  created_by: UserSchema,
  http_repository: z.url(),
  ssh_repository: z.string(),
  default_branch: z.string(),
  access: z.enum(['PUBLIC', 'PRIVATE']),
  fetch_submodules: z.boolean(),
  fetch_submodules_env_key: z.string().optional(),
  allow_pull_requests: z.boolean()
});

export type ProjectResponse = z.infer<typeof ProjectResponseSchema>;

export async function createProject(workspaceDomain: string, projectData: CreateProjectInput, token: string): Promise<ApiResult<ProjectResponse>> {
  try {
    // Validate the input data
    const validatedData = CreateProjectInputSchema.parse(projectData);
    
    const path = `/workspaces/${workspaceDomain}/projects`;
    
    const [response, error] = await apiRequest<ProjectResponse>(path, {
      method: 'POST',
      body: validatedData
    });

    if (error) {
      return [null, error];
    }

    return [response as ProjectResponse, null];
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Create project error: ${errorMsg}`);
    return [null, new ApiError(errorMsg)];
  }
}

/**
 * Get a project by name from the specified workspace
 * Returns a Go-style [result, error] tuple
 * 
 * @param projectName - Name of the project to retrieve
 * @returns Tuple of [ProjectResponse, null] on success or [null, ApiError] on failure
 */
export async function getProject(projectName: string): Promise<ApiResult<ProjectResponse>> {
  const workspace = process.env.BUDDY_WORKSPACE;
  
  if (!workspace) {
    return [null, new ApiError('BUDDY_WORKSPACE environment variable is not set')];
  }

  if (!projectName) {
    return [null, new ApiError('Project name is required')];
  }
  
  const path = `/workspaces/${workspace}/projects/${projectName}`;
  
  const [response, error] = await apiRequest<ProjectResponse>(path);
  
  if (error) {
    return [null, error];
  }

  return [response as ProjectResponse, null];
}

/**
 * Response schema for a commit
 */
export const CommitResponseSchema = z.object({
  url: z.url(),
  html_url: z.url().optional(),
  revision: z.string(),
  short_revision: z.string(),
  author_name: z.string(),
  author_email: z.string().email(),
  message: z.string(),
  create_date: z.string().datetime()
});

export type CommitResponse = z.infer<typeof CommitResponseSchema>;

/**
 * Check if a specific commit exists in the repository
 * Returns a Go-style [result, error] tuple
 * 
 * @param projectName - Name of the project
 * @param revision - The commit hash to check
 * @returns Tuple of [CommitResponse, null] on success or [null, ApiError] on failure
 */
export async function getCommit(projectName: string, revision: string): Promise<ApiResult<CommitResponse>> {
  const workspace = process.env.BUDDY_WORKSPACE;
  
  if (!workspace) {
    return [null, new ApiError('BUDDY_WORKSPACE environment variable is not set')];
  }

  if (!projectName) {
    return [null, new ApiError('Project name is required')];
  }

  if (!revision) {
    return [null, new ApiError('Revision is required')];
  }
  
  const path = `/workspaces/${workspace}/projects/${projectName}/repository/commits/${revision}`;
  
  const [response, error] = await apiRequest<CommitResponse>(path);
  
  if (error) {
    return [null, error];
  }

  return [response as CommitResponse, null];
}

/**
 * Wait until a commit is detected in the Buddy repository
 * Will poll the API with exponential backoff until the commit is found or timeout is reached
 * 
 * @param projectName - Name of the project
 * @param revision - The commit hash to check
 * @param maxAttempts - Maximum number of attempts (default: 10)
 * @param initialDelayMs - Initial delay between attempts in milliseconds (default: 1000)
 * @param maxDelayMs - Maximum delay between attempts in milliseconds (default: 10000)
 * @returns Tuple of [CommitResponse, null] on success or [null, ApiError] on failure
 */
export async function waitForCommitToBePushed(
  projectName: string, 
  revision: string, 
  maxAttempts: number = 10,
  initialDelayMs: number = 1000,
  maxDelayMs: number = 10000
): Promise<ApiResult<CommitResponse>> {
  if (!projectName) {
    return [null, new ApiError('Project name is required')];
  }

  if (!revision) {
    return [null, new ApiError('Revision is required')];
  }

  let attempts = 0;
  let delay = initialDelayMs;

  while (attempts < maxAttempts) {
    attempts++;
    
    // Check if the commit exists
    const [commit, error] = await getCommit(projectName, revision);
    
    // If found, return it
    if (commit && !error) {
      return [commit, null];
    }
    
    // If error is not 404 (not found), return the error
    if (error && error.statusCode !== 404) {
      return [null, error];
    }
    
    logger.info(`Commit ${revision.substring(0, 8)} not yet found in Buddy repository. Attempt ${attempts}/${maxAttempts}, waiting ${delay}ms before next check...`);
    
    // Wait before trying again
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Exponential backoff with max limit
    delay = Math.min(delay * 2, maxDelayMs);
  }

  return [null, new ApiError(`Timeout reached: Commit ${revision} was not found in repository after ${maxAttempts} attempts`)];
}