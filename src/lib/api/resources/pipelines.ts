import logger from '../../logger.js';
import { ActionExecutionResponse, CreatePipelineInput, CreatePipelineInputSchema, PipelineExecutionResponse, PipelineResponse, RunPipelineInput, RunPipelineInputSchema } from '../../../types/api/pipelines.js';
import sleep from '../../utils/sleep.js';
import type { ApiClient } from '../client.js';
import { preparePath } from '../utils/preparePath.js';

export class PipelinesApi {
  constructor(private client: ApiClient) {}

  async create(
    pathParams: { workspace: string; project: string },
    pipelineData: CreatePipelineInput
  ): Promise<PipelineResponse> {
    const validatedData = CreatePipelineInputSchema.parse(pipelineData);

    return this.client.request<PipelineResponse>(
      preparePath('/workspaces/:workspace/projects/:project/pipelines', pathParams),
      {
        method: 'POST',
        body: validatedData,
      }
    );
  }

  async updateByYaml(
    pathParams: { workspace: string; project: string; pipelineId: number },
    yaml: string
  ): Promise<PipelineResponse> {
    return this.client.request<PipelineResponse>(
      preparePath('/workspaces/:workspace/projects/:project/pipelines/:pipelineId/yaml', pathParams),
      {
        method: 'PATCH',
        body: { yaml },
      }
    );
  }

  async get(
    pathParams: { workspace: string; project: string; pipelineId: number }
  ): Promise<PipelineResponse> {
    return this.client.request<PipelineResponse>(
      preparePath('/workspaces/:workspace/projects/:project/pipelines/:pipelineId', pathParams)
    );
  }

  async getExecution(
    pathParams: { workspace: string; project: string; pipelineId: number; executionId: number }
  ): Promise<PipelineExecutionResponse> {
    return this.client.request<PipelineExecutionResponse>(
      preparePath('/workspaces/:workspace/projects/:project/pipelines/:pipelineId/executions/:executionId', pathParams)
    );
  }

  async getActionExecution(
    pathParams: { workspace: string; project: string; pipelineId: number; executionId: number; actionExecutionId: string }
  ): Promise<ActionExecutionResponse> {
    return this.client.request<ActionExecutionResponse>(
      preparePath('/workspaces/:workspace/projects/:project/pipelines/:pipelineId/executions/:executionId/action_executions/:actionExecutionId', pathParams)
    );
  }

  /**
   * Get details for all failed or terminated actions in an execution
   *
   * @param pathParams - Object containing workspace, project, and pipelineId
   * @param execution - The execution object
   * @returns ActionExecutionResponse or null if no failed action found
   */
  async getFailedActionExecution(
    pathParams: { workspace: string; project: string; pipelineId: number },
    execution: PipelineExecutionResponse
  ): Promise<ActionExecutionResponse | null> {
    if (!execution || !execution.id) {
      throw new Error('Valid execution object is required');
    }

    if (!['FAILED'].includes(execution.status)) {
      // If execution is not failed, there are no failed actions to fetch
      return null;
    }

    const failedActionsExecution = execution.action_executions.find(action => action.status === 'FAILED');
    if (!failedActionsExecution) {
      return null;
    }

    return this.getActionExecution({
      ...pathParams,
      executionId: execution.id,
      actionExecutionId: failedActionsExecution.action_execution_id
    });
  }

  /**
   * Get details for publish package version action in an execution
   *
   * @param pathParams - Object containing workspace, project, and pipelineId
   * @param execution - The execution object
   * @returns ActionExecutionResponse or null if no publish package action found
   */
  async getPublishPackageVersionActionExecution(
    pathParams: { workspace: string; project: string; pipelineId: number },
    execution: PipelineExecutionResponse
  ): Promise<ActionExecutionResponse | null> {
    if (!execution || !execution.id) {
      throw new Error('Valid execution object is required');
    }

    const publishPackageActionExecution = execution.action_executions.filter(action => action.action.type === 'PUBLISH_PACKAGE_VERSION').at(-1);
    if (!publishPackageActionExecution) {
      return null;
    }

    return this.getActionExecution({
      ...pathParams,
      executionId: execution.id,
      actionExecutionId: publishPackageActionExecution.action_execution_id
    });
  }

  /**
   * Wait for a pipeline execution to complete (status different from ENQUEUED or INPROGRESS)
   */
  async waitForExecution(
    pathParams: { workspace: string; project: string; pipelineId: number; executionId: number },
    options: { pollInterval?: number; timeout?: number } = {}
  ): Promise<PipelineExecutionResponse> {
    const {
      pollInterval = 5000, // Default poll interval: 5 seconds
      timeout = 600000     // Default timeout: 10 minutes
    } = options;

    const startTime = Date.now();
    const IN_PROGRESS_STATUSES = ['ENQUEUED', 'INPROGRESS'];

    while (Date.now() - startTime < timeout) {
      // Get current execution status
      const execution = await this.getExecution(pathParams);

      logger.info(`Execution ${pathParams.executionId} status: ${execution.status}`);

      // If execution is done, return it
      if (!IN_PROGRESS_STATUSES.includes(execution.status)) {
        return execution;
      }

      // Sleep before next poll
      await sleep(pollInterval);
    }

    throw new Error(`Timeout waiting for execution ${pathParams.executionId} to complete`);
  }

  async run(
    pathParams: { workspace: string; project: string; pipelineId: number },
    executionData: RunPipelineInput
  ): Promise<PipelineExecutionResponse> {
    const validatedData = RunPipelineInputSchema.parse(executionData);

    return this.client.request<PipelineExecutionResponse>(
      preparePath('/workspaces/:workspace/projects/:project/pipelines/:pipelineId/executions', pathParams),
      {
        method: 'POST',
        body: validatedData,
      }
    );
  }
}