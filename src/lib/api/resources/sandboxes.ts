import logger from '../../logger.js';
import { AppLogsResponse, SandboxResponse } from '../../../types/api/sandboxes.js';
import sleep from '../../utils/sleep.js';
import type { ApiClient } from '../client.js';
import { preparePath } from '../utils/preparePath.js';

export class SandboxesApi {
  constructor(private client: ApiClient) {}

  async createByYaml(
    pathParams: { workspace: string },
    queryParams: { project_name: string },
    yaml: string
  ): Promise<SandboxResponse> {
    if (!yaml) {
      throw new Error('YAML configuration is required');
    }

    const response = await this.client.request<SandboxResponse>(
      preparePath('/workspaces/:workspace/sandboxes/yaml', pathParams),
      {
        method: 'POST',
        body: { yaml },
        queryParams,
      }
    );

    logger.info(`Sandbox created successfully with ID: ${response.id}`);
    return response;
  }

  async get(
    pathParams: { workspace: string; sandboxId: string },
    queryParams: { project_name: string }
  ): Promise<SandboxResponse> {
    return this.client.request<SandboxResponse>(
      preparePath('/workspaces/:workspace/sandboxes/:sandboxId', pathParams),
      { queryParams }
    );
  }

  /**
   * Wait for a sandbox to be ready (status different from INPROGRESS)
   */
  async waitForReady(
    pathParams: { workspace: string; sandboxId: string },
    queryParams: { project_name: string },
    options: { pollInterval?: number; timeout?: number } = {}
  ): Promise<SandboxResponse> {
    const {
      pollInterval = 5000, // Default poll interval: 5 seconds
      timeout = 600000     // Default timeout: 10 minutes
    } = options;

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      // Get current sandbox status
      const sandbox = await this.get(pathParams, queryParams);

      logger.info(`Sandbox ${pathParams.sandboxId} status: ${sandbox.status}, setup status: ${sandbox.setup_status}`);

      // If sandbox is no longer in INPROGRESS status, return it
      if (sandbox.setup_status !== 'INPROGRESS') {
        return sandbox;
      }

      // Sleep before next poll
      await sleep(pollInterval);
    }

    throw new Error(`Timeout waiting for sandbox ${pathParams.sandboxId} to change status from INPROGRESS`);
  }

  async updateByYaml(
    pathParams: { workspace: string; sandboxId: string },
    queryParams: { project_name: string },
    yaml: string
  ): Promise<SandboxResponse> {
    if (!yaml) {
      throw new Error('YAML configuration is required');
    }

    const response = await this.client.request<SandboxResponse>(
      preparePath('/workspaces/:workspace/sandboxes/:sandboxId/yaml', pathParams),
      {
        method: 'PATCH',
        body: { yaml },
        queryParams,
      }
    );

    logger.info(`Sandbox updated successfully with ID: ${response.id}`);
    return response;
  }

  async getAppLogs(
    pathParams: { workspace: string; sandboxId: string },
    queryParams: { project_name: string }
  ): Promise<AppLogsResponse> {
    return this.client.request<AppLogsResponse>(
      preparePath('/workspaces/:workspace/sandboxes/:sandboxId/app-logs', pathParams),
      { queryParams }
    );
  }

  generatePreviewUrls(sandbox: SandboxResponse): string[] {
    if (!sandbox.endpoints) {
      return [];
    }

    const httpEndpoints = sandbox.endpoints.filter(endpoint => endpoint.type === 'HTTP');
    logger.debug(`Sandbox generatePreviewUrls: ${JSON.stringify(httpEndpoints, null, 2)}`);

    return httpEndpoints.map(endpoint => {
      const regionSubdomain = `${endpoint.region.toLowerCase()}-${endpoint.ssh_settings!.ssh_id}`;
      return `https://${endpoint.subdomain}.${regionSubdomain}.${endpoint.domain}`;
    });
  }
}