import logger from '../../logger.js';
import { AppLogsResponse, SandboxResponse } from '../../../types/api/sandboxes.js';
import sleep from '../../utils/sleep.js';
import type { ApiClient } from '../client.js';
import { preparePath } from '../utils/preparePath.js';

export class SandboxesApi {
  constructor(private client: ApiClient) {}

  async createByYaml(
    pathParams: { workspace: string; project: string },
    yaml: string
  ): Promise<SandboxResponse> {
    if (!yaml) {
      throw new Error('YAML configuration is required');
    }

    const response = await this.client.request<SandboxResponse>(
      preparePath('/workspaces/:workspace/projects/:project/sandboxes/yaml', pathParams),
      {
        method: 'POST',
        body: { yaml },
      }
    );

    logger.info(`Sandbox created successfully with ID: ${response.id}`);
    return response;
  }

  async get(
    pathParams: { workspace: string; project: string; sandboxId: string }
  ): Promise<SandboxResponse> {
    return this.client.request<SandboxResponse>(
      preparePath('/workspaces/:workspace/projects/:project/sandboxes/:sandboxId', pathParams)
    );
  }

  /**
   * Wait for a sandbox to be ready (status different from CONFIGURING)
   */
  async waitForReady(
    pathParams: { workspace: string; project: string; sandboxId: string },
    options: { pollInterval?: number; timeout?: number } = {}
  ): Promise<SandboxResponse> {
    const {
      pollInterval = 5000, // Default poll interval: 5 seconds
      timeout = 600000     // Default timeout: 10 minutes
    } = options;

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      // Get current sandbox status
      const sandbox = await this.get(pathParams);

      logger.info(`Sandbox ${pathParams.sandboxId} status: ${sandbox.status}, setup status: ${sandbox.setup_status}`);

      // If sandbox is no longer in CONFIGURING status, return it
      if (sandbox.setup_status !== 'CONFIGURING') {
        return sandbox;
      }

      // Sleep before next poll
      await sleep(pollInterval);
    }

    throw new Error(`Timeout waiting for sandbox ${pathParams.sandboxId} to change status from CONFIGURING`);
  }

  async updateByYaml(
    pathParams: { workspace: string; project: string; sandboxId: string },
    yaml: string
  ): Promise<SandboxResponse> {
    if (!yaml) {
      throw new Error('YAML configuration is required');
    }

    const response = await this.client.request<SandboxResponse>(
      preparePath('/workspaces/:workspace/projects/:project/sandboxes/:sandboxId/yaml', pathParams),
      {
        method: 'PATCH',
        body: { yaml },
      }
    );

    logger.info(`Sandbox updated successfully with ID: ${response.id}`);
    return response;
  }

  async getAppLogs(
    pathParams: { workspace: string; project: string; sandboxId: string }
  ): Promise<AppLogsResponse> {
    return this.client.request<AppLogsResponse>(
      preparePath('/workspaces/:workspace/projects/:project/sandboxes/:sandboxId/app-logs', pathParams)
    );
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