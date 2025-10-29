import logger from '../logger.js';
import { WorkspacesApi } from './resources/workspaces.js';
import { ProjectsApi } from './resources/projects.js';
import { PipelinesApi } from './resources/pipelines.js';
import { SandboxesApi } from './resources/sandboxes.js';
import { UserApi } from './resources/user.js';
import { SourceApi } from './resources/source.js';

/**
 * Options for API requests
 */
interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: Record<string, unknown>;
  additionalHeaders?: Record<string, string>;
  queryParams?: Record<string, string>;
}

/**
 * API Error type representing all possible API errors
 */
export class ApiError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

/**
 * Main API client for Buddy API
 *
 * Provides organized access to all Buddy API endpoints through scoped properties:
 * - workspaces: Workspace management
 * - projects: Project and repository management
 * - source: Source control and repository management
 * - pipelines: Pipeline execution and management
 * - sandboxes: Sandbox environment management
 * - user: User and SSH key management
 *
 * @example
 * ```typescript
 * const client = new ApiClient('my-api-token');
 *
 * // Get workspace
 * const workspace = await client.workspaces.get('my-workspace');
 *
 * // Create project
 * const project = await client.projects.create('my-workspace', {
 *   display_name: 'My Project'
 * });
 *
 * // Run pipeline
 * const execution = await client.pipelines.run('my-workspace', 'my-project', 1, {
 *   to_revision: { revision: 'abc123' }
 * });
 * ```
 */
export class ApiClient {
  private token: string;
  private baseUrl: string;

  public readonly workspaces: WorkspacesApi;
  public readonly projects: ProjectsApi;
  public readonly source: SourceApi;
  public readonly pipelines: PipelinesApi;
  public readonly sandboxes: SandboxesApi;
  public readonly user: UserApi;

  /**
   * Creates a new ApiClient instance
   * @param token - Buddy API token for authentication
   */
  constructor(token: string) {
    const baseUrl = process.env.BUDDY_API_URL || 'https://api.buddy.works';

    this.token = token;
    this.baseUrl = baseUrl;
    this.workspaces = new WorkspacesApi(this);
    this.projects = new ProjectsApi(this);
    this.source = new SourceApi(this);
    this.pipelines = new PipelinesApi(this);
    this.sandboxes = new SandboxesApi(this);
    this.user = new UserApi(this);
  }

  async request<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    const {
      method = 'GET',
      body,
      additionalHeaders = {},
      queryParams = {},
    } = options || {};

    // Build URL with query parameters using URL class
    const url = new URL(path, this.baseUrl);
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
      ...additionalHeaders,
    };

    // Set environment variable to disable certificate validation
    // This must be set before the Node.js process starts
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const requestOptions = {
      method,
      headers,
    };

    if (body && (method !== 'GET')) {
      // @ts-ignore - TypeScript doesn't recognize body property
      // but it's supported by the standard fetch API
      requestOptions.body = JSON.stringify(body);
    }

    logger.debug(`API Request: ${method} ${url.toString()}`);
    if (body) {
      logger.debug(`Request body: ${JSON.stringify(body)}`);
    }

    const response = await fetch(url, requestOptions);
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Failed to read error response');
      const errorMsg = `API request failed with status ${response.status}: ${errorText}`;
      logger.error(errorMsg);

      throw new ApiError(errorMsg, response.status);
    }

    const data = await response.json();
    logger.debug(`API Response: ${JSON.stringify(data).substring(0, 200)}${JSON.stringify(data).length > 200 ? '...' : ''}`);
    return data as T;
  }
}