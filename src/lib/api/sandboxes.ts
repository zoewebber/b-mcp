import { z } from 'zod';
import { ApiError, apiRequest, ApiResult } from '../api.js';
import logger from '../logger.js';

// Response schema for SSH settings
export const SshSettingsSchema = z.object({
  ssh_id: z.string(),
});

// Response schema for sandbox endpoint
export const SandboxEndpointSchema = z.object({
  type: z.string(),
  subdomain: z.string(),
  domain: z.string(),
  region: z.string(),
  port: z.number().optional(),
  ssh_settings: SshSettingsSchema.optional(),
});

// Response schema for sandbox
export const SandboxResponseSchema = z.object({
  identifier: z.string(),
  id: z.string(),
  name: z.string(),
  url: z.url(),
  html_url: z.url(),
  created_date: z.string().datetime(),
  last_updated_date: z.string().datetime().optional(),
  status: z.string(),
  setup_status: z.string(),
  description: z.string().optional(),
  boot_logs: z.array(z.string()),
  app_status: z.enum(['ACTIVE', 'INACTIVE', 'FAILED']).optional(),
  endpoints: z.array(SandboxEndpointSchema).optional(),
});

export type SandboxResponse = z.infer<typeof SandboxResponseSchema>;

// Sandbox status constants
export const SandboxStatus = {
  STARTING: 'STARTING',
  RUNNING: 'RUNNING',
  FAILED: 'FAILED',
  STOPPED: 'STOPPED'
} as const;

export type SandboxStatusType = typeof SandboxStatus[keyof typeof SandboxStatus];

// Response schema for sandbox app logs
export const AppLogsResponseSchema = z.object({
  logs: z.array(z.string()),
});

export type AppLogsResponse = z.infer<typeof AppLogsResponseSchema>;

/**
 * Create a new sandbox in the specified project using YAML configuration
 * Returns a Go-style [ApiResult, error] tuple
 * 
 * @param projectName - The name/slug of the project
 * @param yaml - YAML configuration for the sandbox
 * @returns Tuple of [SandboxResponse, null] on success or [null, ApiError] on failure
 */
export async function createSandboxByYaml(
  projectName: string,
  yaml: string
): Promise<ApiResult<SandboxResponse>> {
  const workspace = process.env.BUDDY_WORKSPACE;
  
  if (!workspace) {
    return [null, new ApiError('BUDDY_WORKSPACE environment variable is not set')];
  }

  if (!projectName) {
    return [null, new ApiError('Project name is required')];
  }

  if (!yaml) {
    return [null, new ApiError('YAML configuration is required')];
  }
  
  try {
    const path = `/workspaces/${workspace}/projects/${projectName}/sandboxes/yaml`;
    
    const [response, error] = await apiRequest<SandboxResponse>(path, {
      method: 'POST',
      body: { yaml }
    });
    
    if (error) {
      return [null, error];
    }

    logger.info(`Sandbox created successfully with ID: ${response.id}`);
    return [response as SandboxResponse, null];
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Create sandbox error: ${errorMsg}`);
    return [null, new ApiError(errorMsg)];
  }
}

/**
 * Get a sandbox by ID
 * Returns a Go-style [ApiResult, error] tuple
 * 
 * @param projectName - The name/slug of the project
 * @param sandboxId - The ID of the sandbox to get
 * @returns Tuple of [SandboxResponse, null] on success or [null, ApiError] on failure
 */
export async function getSandbox(
  projectName: string,
  sandboxId: string
): Promise<ApiResult<SandboxResponse>> {
  const workspace = process.env.BUDDY_WORKSPACE;
  
  if (!workspace) {
    return [null, new ApiError('BUDDY_WORKSPACE environment variable is not set')];
  }

  if (!projectName) {
    return [null, new ApiError('Project name is required')];
  }

  if (!sandboxId) {
    return [null, new ApiError('Sandbox ID is required')];
  }
  
  try {
    const path = `/workspaces/${workspace}/projects/${projectName}/sandboxes/${sandboxId}`;
    
    const [response, error] = await apiRequest<SandboxResponse>(path, {
      method: 'GET'
    });
    
    if (error) {
      return [null, error];
    }

    return [response as SandboxResponse, null];
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Get sandbox error: ${errorMsg}`);
    return [null, new ApiError(errorMsg)];
  }
}

/**
 * Wait for a sandbox to be ready (status different from STARTING)
 * Returns a Go-style [ApiResult, error] tuple
 * 
 * @param projectName - The name/slug of the project
 * @param sandboxId - The ID of the sandbox to wait for
 * @param options - Additional options (pollInterval in ms, timeout in ms)
 * @returns Tuple of [SandboxResponse, null] on success or [null, ApiError] on failure
 */
export async function waitForSandbox(
  projectName: string,
  sandboxId: string,
  options: { pollInterval?: number; timeout?: number } = {}
): Promise<ApiResult<SandboxResponse>> {
  const workspace = process.env.BUDDY_WORKSPACE;
  
  if (!workspace) {
    return [null, new ApiError('BUDDY_WORKSPACE environment variable is not set')];
  }

  const { 
    pollInterval = 5000, // Default poll interval: 5 seconds
    timeout = 600000     // Default timeout: 10 minutes
  } = options;

  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    // Get current sandbox status
    const [sandbox, error] = await getSandbox(projectName, sandboxId);
    
    if (error) {
      return [null, error];
    }
    
    logger.info(`Sandbox ${sandboxId} status: ${sandbox.status}, setup status: ${sandbox.setup_status}`);
    
    // If sandbox is no longer in STARTING status, return it
    if (sandbox.setup_status !== 'CONFIGURING') {
      return [sandbox, null];
    }
    
    // Sleep before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  return [null, new ApiError(`Timeout waiting for sandbox ${sandboxId} to change status from STARTING`)];
}

/**
 * Update an existing sandbox with new YAML configuration
 * Returns a Go-style [ApiResult, error] tuple
 * 
 * @param projectName - The name/slug of the project
 * @param sandboxId - The ID of the sandbox to update
 * @param yaml - YAML configuration for the sandbox update
 * @returns Tuple of [SandboxResponse, null] on success or [null, ApiError] on failure
 */
export async function updateSandboxByYaml(
  projectName: string,
  sandboxId: string,
  yaml: string
): Promise<ApiResult<SandboxResponse>> {
  const workspace = process.env.BUDDY_WORKSPACE;
  
  if (!workspace) {
    return [null, new ApiError('BUDDY_WORKSPACE environment variable is not set')];
  }

  if (!projectName) {
    return [null, new ApiError('Project name is required')];
  }

  if (!sandboxId) {
    return [null, new ApiError('Sandbox ID is required')];
  }

  if (!yaml) {
    return [null, new ApiError('YAML configuration is required')];
  }
  
  try {
    const path = `/workspaces/${workspace}/projects/${projectName}/sandboxes/${sandboxId}/yaml`;
    
    const [response, error] = await apiRequest<SandboxResponse>(path, {
      method: 'PATCH',
      body: { yaml }
    });
    
    if (error) {
      return [null, error];
    }

    logger.info(`Sandbox updated successfully with ID: ${response.id}`);
    return [response as SandboxResponse, null];
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Update sandbox error: ${errorMsg}`);
    return [null, new ApiError(errorMsg)];
  }
}

/**
 * Get app logs for a sandbox
 * Returns a Go-style [ApiResult, error] tuple
 * 
 * @param projectName - The name/slug of the project
 * @param sandboxId - The ID of the sandbox to get logs for
 * @returns Tuple of [AppLogsResponse, null] on success or [null, ApiError] on failure
 */
export async function getSandboxAppLogs(
  projectName: string,
  sandboxId: string
): Promise<ApiResult<AppLogsResponse>> {
  const workspace = process.env.BUDDY_WORKSPACE;
  if (!workspace) {
    return [null, new ApiError('Workspace name is required')];
  }

  if (!projectName) {
    return [null, new ApiError('Project name is required')];
  }

  if (!sandboxId) {
    return [null, new ApiError('Sandbox ID is required')];
  }
  
  try {
    const path = `/workspaces/${workspace}/projects/${projectName}/sandboxes/${sandboxId}/app-logs`;
    
    const [response, error] = await apiRequest<AppLogsResponse>(path, {
      method: 'GET'
    });
    
    if (error) {
      return [null, error];
    }

    return [response as AppLogsResponse, null];
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Get sandbox app logs error: ${errorMsg}`);
    return [null, new ApiError(errorMsg)];
  }
}

/**
 * Generate preview URLs for sandbox endpoints
 * Returns URLs only for HTTP type endpoints
 * URL format: https://{subdomain}.{region-lowercase}-{ssh_id}.{domain}
 * 
 * @param sandbox - The sandbox response object
 * @returns Array of preview URLs for HTTP endpoints
 */
export function generateSandboxPreviewUrls(sandbox: SandboxResponse): string[] {
  if (!sandbox.endpoints) {
    return [];
  }

  const httpEndpoints = sandbox.endpoints.filter(endpoint => endpoint.type === 'HTTP');
  
  return httpEndpoints.map(endpoint => {
    const regionSubdomain = `${endpoint.region.toLowerCase()}-${endpoint.ssh_settings!.ssh_id}`;
    return `https://${endpoint.subdomain}.${regionSubdomain}.${endpoint.domain}`;
  });
}