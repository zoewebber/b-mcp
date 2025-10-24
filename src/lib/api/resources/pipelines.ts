import logger from '../../logger.js';
import { ActionExecutionResponse, CreatePipelineInput, CreatePipelineInputSchema, PipelineExecutionResponse, PipelineResponse, RunPipelineInput, RunPipelineInputSchema } from '../../../types/api/pipelines.js';
import sleep from '../../utils/sleep.js';
import type { ApiClient } from '../client.js';
import { preparePath } from '../utils/preparePath.js';
import { validateParams } from '../utils/validateParams.js';

export class PipelinesApi {
  constructor(private client: ApiClient) {}

  async create(
    params: { workspace: string; project_name: string },
    pipelineData: CreatePipelineInput
  ): Promise<PipelineResponse> {
    validateParams(params, ['workspace', 'project_name']);
    const validatedData = CreatePipelineInputSchema.parse(pipelineData);

    return this.client.request<PipelineResponse>(
      preparePath('/workspaces/:workspace/projects/:project_name/pipelines', params),
      {
        method: 'POST',
        body: validatedData,
      }
    );
  }

  async updateByYaml(
    params: { workspace: string; project_name: string; pipeline_id: number },
    yaml: string
  ): Promise<PipelineResponse> {
    validateParams(params, ['workspace', 'project_name', 'pipeline_id']);

    return this.client.request<PipelineResponse>(
      preparePath('/workspaces/:workspace/projects/:project_name/pipelines/:pipeline_id/yaml', params),
      {
        method: 'PATCH',
        body: { yaml },
      }
    );
  }

  async get(
    params: { workspace: string; project_name: string; pipeline_id: number }
  ): Promise<PipelineResponse> {
    validateParams(params, ['workspace', 'project_name', 'pipeline_id']);

    return this.client.request<PipelineResponse>(
      preparePath('/workspaces/:workspace/projects/:project_name/pipelines/:pipeline_id', params)
    );
  }

  async getExecution(
    params: { workspace: string; project_name: string; pipeline_id: number; execution_id: number }
  ): Promise<PipelineExecutionResponse> {
    validateParams(params, ['workspace', 'project_name', 'pipeline_id', 'execution_id']);

    return this.client.request<PipelineExecutionResponse>(
      preparePath('/workspaces/:workspace/projects/:project_name/pipelines/:pipeline_id/executions/:execution_id', params)
    );
  }

  async getActionExecution(
    params: { workspace: string; project_name: string; pipeline_id: number; execution_id: number; action_execution_id: string }
  ): Promise<ActionExecutionResponse> {
    validateParams(params, ['workspace', 'project_name', 'pipeline_id', 'execution_id', 'action_execution_id']);

    return this.client.request<ActionExecutionResponse>(
      preparePath('/workspaces/:workspace/projects/:project_name/pipelines/:pipeline_id/executions/:execution_id/action_executions/:action_execution_id', params)
    );
  }

  /**
   * Get details for all failed or terminated actions in an execution
   *
   * @param params - Object containing workspace, project_name, and pipeline_id
   * @param execution - The execution object
   * @returns ActionExecutionResponse or null if no failed action found
   */
  async getFailedActionExecution(
    params: { workspace: string; project_name: string; pipeline_id: number },
    execution: PipelineExecutionResponse
  ): Promise<ActionExecutionResponse | null> {
    validateParams(params, ['workspace', 'project_name', 'pipeline_id']);

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
      ...params,
      execution_id: execution.id,
      action_execution_id: failedActionsExecution.action_execution_id
    });
  }

  /**
   * Get details for publish package version action in an execution
   *
   * @param params - Object containing workspace, project_name, and pipeline_id
   * @param execution - The execution object
   * @returns ActionExecutionResponse or null if no publish package action found
   */
  async getPublishPackageVersionActionExecution(
    params: { workspace: string; project_name: string; pipeline_id: number },
    execution: PipelineExecutionResponse
  ): Promise<ActionExecutionResponse | null> {
    validateParams(params, ['workspace', 'project_name', 'pipeline_id']);

    if (!execution || !execution.id) {
      throw new Error('Valid execution object is required');
    }

    const publishPackageActionExecution = execution.action_executions.filter(action => action.action.type === 'PUBLISH_PACKAGE_VERSION').at(-1);
    if (!publishPackageActionExecution) {
      return null;
    }

    return this.getActionExecution({
      ...params,
      execution_id: execution.id,
      action_execution_id: publishPackageActionExecution.action_execution_id
    });
  }

  /**
   * Wait for a pipeline execution to complete (status different from ENQUEUED or INPROGRESS)
   */
  async waitForExecution(
    params: { workspace: string; project_name: string; pipeline_id: number; execution_id: number },
    options: { pollInterval?: number; timeout?: number } = {}
  ): Promise<PipelineExecutionResponse> {
    validateParams(params, ['workspace', 'project_name', 'pipeline_id', 'execution_id']);

    const {
      pollInterval = 5000, // Default poll interval: 5 seconds
      timeout = 600000     // Default timeout: 10 minutes
    } = options;

    const startTime = Date.now();
    const IN_PROGRESS_STATUSES = ['ENQUEUED', 'INPROGRESS'];

    while (Date.now() - startTime < timeout) {
      // Get current execution status
      const execution = await this.getExecution(params);

      logger.info(`Execution ${params.execution_id} status: ${execution.status}`);

      // If execution is done, return it
      if (!IN_PROGRESS_STATUSES.includes(execution.status)) {
        return execution;
      }

      // Sleep before next poll
      await sleep(pollInterval);
    }

    throw new Error(`Timeout waiting for execution ${params.execution_id} to complete`);
  }

  async run(
    params: { workspace: string; project_name: string; pipeline_id: number },
    executionData: RunPipelineInput
  ): Promise<PipelineExecutionResponse> {
    validateParams(params, ['workspace', 'project_name', 'pipeline_id']);
    const validatedData = RunPipelineInputSchema.parse(executionData);

    return this.client.request<PipelineExecutionResponse>(
      preparePath('/workspaces/:workspace/projects/:project_name/pipelines/:pipeline_id/executions', params),
      {
        method: 'POST',
        body: validatedData,
      }
    );
  }
}