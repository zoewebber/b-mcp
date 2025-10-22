import logger from '../../logger.js';
import { AppLogsResponse, SandboxResponse } from '../../../types/api/sandboxes.js';
import sleep from '../../sleep.js';
import type { ApiClient } from '../client.js';

export class SandboxesApi {
  constructor(private client: ApiClient) {}

  async createByYaml(
    workspaceDomain: string,
    projectName: string,
    yaml: string
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

    const response = await this.client.request<SandboxResponse>(`/workspaces/${workspaceDomain}/projects/${projectName}/sandboxes/yaml`, {
      method: 'POST',
      body: { yaml },
    });

    logger.info(`Sandbox created successfully with ID: ${response.id}`);
    return response;
  }

  async get(
    workspaceDomain: string,
    projectName: string,
    sandboxId: string
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

    return this.client.request<SandboxResponse>(`/workspaces/${workspaceDomain}/projects/${projectName}/sandboxes/${sandboxId}`);
  }

  /**
   * Wait for a sandbox to be ready (status different from CONFIGURING)
   */
  async waitForReady(
    workspaceDomain: string,
    projectName: string,
    sandboxId: string,
    options: { pollInterval?: number; timeout?: number } = {}
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
      const sandbox = await this.get(workspaceDomain, projectName, sandboxId);

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

  async updateByYaml(
    workspaceDomain: string,
    projectName: string,
    sandboxId: string,
    yaml: string
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

    const response = await this.client.request<SandboxResponse>(`/workspaces/${workspaceDomain}/projects/${projectName}/sandboxes/${sandboxId}/yaml`, {
      method: 'PATCH',
      body: { yaml },
    });

    logger.info(`Sandbox updated successfully with ID: ${response.id}`);
    return response;
  }

  async getAppLogs(
    workspaceDomain: string,
    projectName: string,
    sandboxId: string
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

    return this.client.request<AppLogsResponse>(`/workspaces/${workspaceDomain}/projects/${projectName}/sandboxes/${sandboxId}/app-logs`);
  }

  generatePreviewUrls(sandbox: SandboxResponse): string[] {
    if (!sandbox.endpoints) {
      return [];
    }

    const httpEndpoints = sandbox.endpoints.filter(endpoint => endpoint.type === 'HTTP');

    return httpEndpoints.map(endpoint => {
      const regionSubdomain = `${endpoint.region.toLowerCase()}-${endpoint.ssh_settings!.ssh_id}`;
      return `https://${endpoint.subdomain}.${regionSubdomain}.${endpoint.domain}`;
    });
  }
}