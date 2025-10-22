import { apiRequest } from '../api.js';
import logger from '../logger.js';
import { AppLogsResponse, SandboxResponse } from '../../types/api/sandboxes.js';
import sleep from '../sleep.js';

export async function createSandboxByYaml(
  workspaceDomain: string,
  projectName: string,
  yaml: string,
  token: string
): Promise<SandboxResponse> {
  if (!workspaceDomain) {
    throw new Error('Workspace is required');
  }

  if (!projectName) {
    throw new Error('Project name is required');
  }

  if (!yaml) {
    throw new Error('YAML configuration is required');
  }

  const response = await apiRequest<SandboxResponse>(`/workspaces/${workspaceDomain}/projects/${projectName}/sandboxes/yaml`, {
    method: 'POST',
    body: { yaml },
    token
  });

  logger.info(`Sandbox created successfully with ID: ${response.id}`);
  return response;
}

export async function getSandbox(
  workspaceDomain: string,
  projectName: string,
  sandboxId: string,
  token: string
): Promise<SandboxResponse> {
  if (!workspaceDomain) {
    throw new Error('Workspace is required');
  }

  if (!projectName) {
    throw new Error('Project name is required');
  }

  if (!sandboxId) {
    throw new Error('Sandbox ID is required');
  }

  return apiRequest<SandboxResponse>(`/workspaces/${workspaceDomain}/projects/${projectName}/sandboxes/${sandboxId}`, {
    token
  });
}

/**
 * Wait for a sandbox to be ready (status different from CONFIGURING)
 */
export async function waitForSandbox(
  workspaceDomain: string,
  projectName: string,
  sandboxId: string,
  options: { pollInterval?: number; timeout?: number } = {},
  token: string
): Promise<SandboxResponse> {
  if (!workspaceDomain) {
    throw new Error('Workspace is required');
  }

  if (!projectName) {
    throw new Error('Project name is required');
  }

  if (!sandboxId) {
    throw new Error('Sandbox ID is required');
  }

  const {
    pollInterval = 5000, // Default poll interval: 5 seconds
    timeout = 600000     // Default timeout: 10 minutes
  } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    // Get current sandbox status
    const sandbox = await getSandbox(workspaceDomain, projectName, sandboxId, token);

    logger.info(`Sandbox ${sandboxId} status: ${sandbox.status}, setup status: ${sandbox.setup_status}`);

    // If sandbox is no longer in CONFIGURING status, return it
    if (sandbox.setup_status !== 'CONFIGURING') {
      return sandbox;
    }

    // Sleep before next poll
    await sleep(pollInterval);
  }

  throw new Error(`Timeout waiting for sandbox ${sandboxId} to change status from CONFIGURING`);
}

export async function updateSandboxByYaml(
  workspaceDomain: string,
  projectName: string,
  sandboxId: string,
  yaml: string,
  token: string
): Promise<SandboxResponse> {
  if (!workspaceDomain) {
    throw new Error('Workspace is required');
  }

  if (!projectName) {
    throw new Error('Project name is required');
  }

  if (!sandboxId) {
    throw new Error('Sandbox ID is required');
  }

  if (!yaml) {
    throw new Error('YAML configuration is required');
  }

  const response = await apiRequest<SandboxResponse>(`/workspaces/${workspaceDomain}/projects/${projectName}/sandboxes/${sandboxId}/yaml`, {
    method: 'PATCH',
    body: { yaml },
    token
  });

  logger.info(`Sandbox updated successfully with ID: ${response.id}`);
  return response;
}

export async function getSandboxAppLogs(
  workspaceDomain: string,
  projectName: string,
  sandboxId: string,
  token: string
): Promise<AppLogsResponse> {
  if (!workspaceDomain) {
    throw new Error('Workspace is required');
  }

  if (!projectName) {
    throw new Error('Project name is required');
  }

  if (!sandboxId) {
    throw new Error('Sandbox ID is required');
  }

  return apiRequest<AppLogsResponse>(`/workspaces/${workspaceDomain}/projects/${projectName}/sandboxes/${sandboxId}/app-logs`, {
    token
  });
}

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