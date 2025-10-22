import { apiRequest } from '../api.js';
import logger from '../logger.js';
import { ActionExecutionResponse, CreatePipelineInput, CreatePipelineInputSchema, PipelineExecutionResponse, PipelineResponse, RunPipelineInput, RunPipelineInputSchema } from '../../types/api/pipelines.js';
import sleep from '../sleep';

export async function createPipeline(
  workspaceDomain: string,
  projectName: string,
  pipelineData: CreatePipelineInput,
  token: string
): Promise<PipelineResponse> {
  if (!workspaceDomain) {
    throw new Error('Workspace is required');
  }

  if (!projectName) {
    throw new Error('Project name is required');
  }

  const validatedData = CreatePipelineInputSchema.parse(pipelineData);

  return apiRequest<PipelineResponse>(`/workspaces/${workspaceDomain}/projects/${projectName}/pipelines`, {
    method: 'POST',
    body: validatedData,
    token
  });
}

export async function updatePipelineByYaml(
  workspaceDomain: string,
  projectName: string,
  pipelineId: number,
  yaml: string,
  token: string
): Promise<PipelineResponse> {
  if (!workspaceDomain) {
    throw new Error('Workspace is required');
  }

  if (!projectName) {
    throw new Error('Project name is required');
  }

  if (!pipelineId) {
    throw new Error('Pipeline ID is required');
  }

  return apiRequest<PipelineResponse>(`/workspaces/${workspaceDomain}/projects/${projectName}/pipelines/${pipelineId}/yaml`, {
    method: 'PATCH',
    body: { yaml },
    token
  });
}

export async function getPipeline(
  workspaceDomain: string,
  projectName: string,
  pipelineId: number,
  token: string
): Promise<PipelineResponse> {
  if (!workspaceDomain) {
    throw new Error('Workspace is required');
  }

  if (!projectName) {
    throw new Error('Project name is required');
  }

  if (!pipelineId) {
    throw new Error('Pipeline ID  is required');
  }

  return apiRequest<PipelineResponse>(`/workspaces/${workspaceDomain}/projects/${projectName}/pipelines/${pipelineId}`, {
    token
  });
}

export async function getExecution(
  workspaceDomain: string,
  projectName: string,
  pipelineId: number,
  executionId: number,
  token: string,
): Promise<PipelineExecutionResponse> {
  if (!workspaceDomain) {
    throw new Error('Workspace is required');
  }

  if (!projectName) {
    throw new Error('Project name is required');
  }

  if (!pipelineId) {
    throw new Error('Pipeline ID is required');
  }

  if (!executionId) {
    throw new Error('Execution ID is required');
  }

  return apiRequest<PipelineExecutionResponse>(`/workspaces/${workspaceDomain}/projects/${projectName}/pipelines/${pipelineId}/executions/${executionId}`, {
    token
  });
}

export async function getActionExecution(
  workspaceDomain: string,
  projectName: string,
  pipelineId: number,
  executionId: number,
  actionExecutionId: string,
  token: string
): Promise<ActionExecutionResponse> {
  if (!workspaceDomain) {
    throw new Error('Workspace is required');
  }

  if (!projectName) {
    throw new Error('Project name is required');
  }

  if (!pipelineId) {
    throw new Error('Pipeline ID is required');
  }

  if (!executionId) {
    throw new Error('Execution ID is required');
  }

  if (!actionExecutionId) {
    throw new Error('Action Execution ID is required');
  }

  return apiRequest<ActionExecutionResponse>(`/workspaces/${workspaceDomain}/projects/${projectName}/pipelines/${pipelineId}/executions/${executionId}/action_executions/${actionExecutionId}`, {
    token
  });
}

/**
 * Get details for all failed or terminated actions in an execution
 *
 * @param workspaceDomain - The workspace domain
 * @param projectName - The name/slug of the project
 * @param pipelineId - The ID of the pipeline
 * @param execution - The execution object
 * @param token - Optional API token
 * @returns ActionExecutionResponse or null if no failed action found
 */
export async function getFailedActionExecution(
  workspaceDomain: string,
  projectName: string,
  pipelineId: number,
  execution: PipelineExecutionResponse,
  token: string
): Promise<ActionExecutionResponse | null> {
  if (!workspaceDomain) {
    throw new Error('Workspace is required');
  }

  if (!projectName) {
    throw new Error('Project name is required');
  }

  if (!pipelineId) {
    throw new Error('Pipeline ID is required');
  }

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

  return getActionExecution(
    workspaceDomain,
    projectName,
    pipelineId,
    execution.id,
    failedActionsExecution.action_execution_id,
    token
  );
}

/**
 * Get details for publish package version action in an execution
 *
 * @param workspaceDomain - The workspace domain
 * @param projectName - The name/slug of the project
 * @param pipelineId - The ID of the pipeline
 * @param execution - The execution object
 * @param token - Optional API token
 * @returns ActionExecutionResponse or null if no publish package action found
 */
export async function getPublishPackageVersionActionExecution(
  workspaceDomain: string,
  projectName: string,
  pipelineId: number,
  execution: PipelineExecutionResponse,
  token: string
): Promise<ActionExecutionResponse | null> {
  if (!workspaceDomain) {
    throw new Error('Workspace is required');
  }

  if (!projectName) {
    throw new Error('Project name is required');
  }

  if (!pipelineId) {
    throw new Error('Pipeline ID is required');
  }

  if (!execution || !execution.id) {
    throw new Error('Valid execution object is required');
  }

  const publishPackageActionExecution = execution.action_executions.filter(action => action.action.type === 'PUBLISH_PACKAGE_VERSION').at(-1);
  if (!publishPackageActionExecution) {
    return null;
  }

  return getActionExecution(
    workspaceDomain,
    projectName,
    pipelineId,
    execution.id,
    publishPackageActionExecution.action_execution_id,
    token
  );
}

/**
 * Wait for a pipeline execution to complete (status different from ENQUEUED or INPROGRESS)
 */
export async function waitForExecution(
  workspaceDomain: string,
  projectName: string,
  pipelineId: number,
  executionId: number,
  options: { pollInterval?: number; timeout?: number } = {},
  token: string
): Promise<PipelineExecutionResponse> {
  if (!workspaceDomain) {
    throw new Error('Workspace is required');
  }

  if (!projectName) {
    throw new Error('Project name is required');
  }

  if (!pipelineId) {
    throw new Error('Pipeline ID is required');
  }

  if (!executionId) {
    throw new Error('Execution ID is required');
  }

  const {
    pollInterval = 5000, // Default poll interval: 5 seconds
    timeout = 600000     // Default timeout: 10 minutes
  } = options;

  const startTime = Date.now();
  const IN_PROGRESS_STATUSES = ['ENQUEUED', 'INPROGRESS'];

  while (Date.now() - startTime < timeout) {
    // Get current execution status
    const execution = await getExecution(workspaceDomain, projectName, pipelineId, executionId, token);

    logger.info(`Execution ${executionId} status: ${execution.status}`);

    // If execution is done, return it
    if (!IN_PROGRESS_STATUSES.includes(execution.status)) {
      return execution;
    }

    // Sleep before next poll
    await sleep(pollInterval);
  }

  throw new Error(`Timeout waiting for execution ${executionId} to complete`);
}

export async function runPipeline(
  workspaceDomain: string,
  projectName: string,
  pipelineId: number,
  executionData: RunPipelineInput,
  token: string
): Promise<PipelineExecutionResponse> {
  if (!workspaceDomain) {
    throw new Error('Workspace is required');
  }

  if (!projectName) {
    throw new Error('Project name is required');
  }

  if (!pipelineId) {
    throw new Error('Pipeline ID is required');
  }

  const validatedData = RunPipelineInputSchema.parse(executionData);

  return apiRequest<PipelineExecutionResponse>(`/workspaces/${workspaceDomain}/projects/${projectName}/pipelines/${pipelineId}/executions`, {
    method: 'POST',
    body: validatedData,
    token
  });
}