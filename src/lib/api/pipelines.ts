import { z } from 'zod';
import { apiRequest, ApiError, ApiResult } from '../api.js';
import logger from '../logger.js';

// Input schema for creating a pipeline
export const CreatePipelineInputSchema = z.object({
  name: z.string().describe('Name of the pipeline'),
  // refs: z.array(z.string()).describe('Git references that are used as git context in the pipeline'),
  // Add more fields as needed in the future
});

export type CreatePipelineInput = z.infer<typeof CreatePipelineInputSchema>;

export const RunPipelineInputSchema = z.object({
  to_revision: z.object({
    revision: z.string()
  }),
  branch: z.object({
    name: z.string().describe('Name of the branch'),
  }).optional(),
  comment: z.string().optional(),
});

export type RunPipelineInput = z.infer<typeof RunPipelineInputSchema>;

// Response schema for created pipeline
export const PipelineResponseSchema = z.object({
  url: z.url(),
  html_url: z.url(),
  id: z.number(),
  name: z.string(),
  on: z.string().optional(), // trigger type
  refs: z.array(z.string()).optional(), // Git references that trigger the pipeline
  always_from_scratch: z.boolean().optional(),
  auto_clear_cache: z.boolean().optional(),
  no_skip_to_recent: z.boolean().optional(),
  do_not_create_commit_status: z.boolean().optional(),
  start_date: z.string().datetime().optional(),
  last_execution_date: z.string().datetime().optional(),
  last_execution_status: z.string().optional(),
  created_date: z.string().datetime(),
  create_date: z.string().datetime().optional(), // Alternative date format in some APIs
  disabled: z.boolean().optional(),
  priority: z.string().optional(),
  execution_message_template: z.string().optional()
});

export type PipelineResponse = z.infer<typeof PipelineResponseSchema>;

// Response schema for action execution details
export const ActionExecutionResponseSchema = z.object({
  status: z.string(),
  progress: z.number(),
  action_execution_id: z.string(),
  action: z.object({
    id: z.number(),
    name: z.string(),
    type: z.string(),
    url: z.url(),
    html_url: z.url()
  }),
  start_date: z.string().datetime(),
  finish_date: z.string().datetime(),
  log: z.array(z.string()),
  outputted_variables: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
});

export type ActionExecutionResponse = z.infer<typeof ActionExecutionResponseSchema>;

// Response schema for pipeline execution
export const PipelineExecutionResponseSchema = z.object({
  url: z.url(),
  html_url: z.url().optional(),
  id: z.number(),
  start_date: z.string().datetime().optional(),
  finish_date: z.string().datetime().optional(),
  status: z.string(),
  comment: z.string().optional(),
  branch: z.object({
    name: z.string(),
  }).optional(),
  action_executions: z.array(ActionExecutionResponseSchema)
});

export type PipelineExecutionResponse = z.infer<typeof PipelineExecutionResponseSchema>;


/**
 * Create a new pipeline in the specified project
 * Returns a Go-style [ApiResult, error] tuple
 *
 * @param projectName - The name/slug of the project
 * @param pipelineData - Pipeline configuration data
 * @returns Tuple of [PipelineResponse, null] on success or [null, ApiError] on failure
 */
export async function createPipeline(
  projectName: string,
  pipelineData: CreatePipelineInput
): Promise<ApiResult<PipelineResponse>> {
  const workspace = process.env.BUDDY_WORKSPACE;

  if (!workspace) {
    return [null, new ApiError('BUDDY_WORKSPACE environment variable is not set')];
  }

  if (!projectName) {
    return [null, new ApiError('Project name is required')];
  }

  try {
    // Validate the input data
    const validatedData = CreatePipelineInputSchema.parse(pipelineData);

    const path = `/workspaces/${workspace}/projects/${projectName}/pipelines`;

    const [response, error] = await apiRequest<PipelineResponse>(path, {
      method: 'POST',
      body: validatedData
    });

    if (error) {
      return [null, error];
    }


    return [response as PipelineResponse, null];
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Create pipeline error: ${errorMsg}`);
    return [null, new ApiError(errorMsg)];
  }
}

/**
 * Update a pipeline by YAML in the specified project
 * Returns a Go-style [ApiResult, error] tuple
 *
 * @param projectName - The name/slug of the project
 * @param pipelineId - The ID of the pipeline to update
 * @param yaml - YAML configuration for the pipeline
 * @returns Tuple of [PipelineResponse, null] on success or [null, ApiError] on failure
 */
export async function updatePipelineByYaml(
  projectName: string,
  pipelineId: number,
  yaml: string
): Promise<ApiResult<PipelineResponse>> {
  const workspace = process.env.BUDDY_WORKSPACE;

  if (!workspace) {
    return [null, new ApiError('BUDDY_WORKSPACE environment variable is not set')];
  }

  if (!projectName) {
    return [null, new ApiError('Project name is required')];
  }

  if (!pipelineId) {
    return [null, new ApiError('Pipeline ID is required')];
  }

  const path = `/workspaces/${workspace}/projects/${projectName}/pipelines/${pipelineId}/yaml`;

  try {
    const [response, error] = await apiRequest<PipelineResponse>(path, {
      method: 'PATCH',
      body: { yaml }
    });

    if (error) {
      return [null, error];
    }

    return [response as PipelineResponse, null];
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Update pipeline error: ${errorMsg}`);
    return [null, new ApiError(errorMsg)];
  }
}

/**
 * Get a pipeline by ID
 * Returns a Go-style [ApiResult, error] tuple
 *
 * @param projectName - The name/slug of the project
 * @param pipelineId - The ID of the pipeline to get
 * @returns Tuple of [PipelineResponse, null] on success or [null, ApiError] on failure
 */
export async function getPipeline(
  projectName: string,
  pipelineId: number
): Promise<ApiResult<PipelineResponse>> {
  const workspace = process.env.BUDDY_WORKSPACE;

  if (!workspace) {
    return [null, new ApiError('BUDDY_WORKSPACE environment variable is not set')];
  }

  if (!projectName) {
    return [null, new ApiError('Project name is required')];
  }

  if (!pipelineId) {
    return [null, new ApiError('Pipeline ID is required')];
  }

  try {
    const path = `/workspaces/${workspace}/projects/${projectName}/pipelines/${pipelineId}`;

    const [response, error] = await apiRequest<PipelineResponse>(path, {
      method: 'GET'
    });

    if (error) {
      return [null, error];
    }

    return [response as PipelineResponse, null];
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Get pipeline error: ${errorMsg}`);
    return [null, new ApiError(errorMsg)];
  }
}

/**
 * Get a specific execution of a pipeline
 * Returns a Go-style [ApiResult, error] tuple
 *
 * @param projectName - The name/slug of the project
 * @param pipelineId - The ID of the pipeline
 * @param executionId - The ID of the execution to get
 * @returns Tuple of [PipelineExecutionResponse, null] on success or [null, ApiError] on failure
 */
export async function getExecution(
  projectName: string,
  pipelineId: number,
  executionId: number
): Promise<ApiResult<PipelineExecutionResponse>> {
  const workspace = process.env.BUDDY_WORKSPACE;

  if (!workspace) {
    return [null, new ApiError('BUDDY_WORKSPACE environment variable is not set')];
  }

  if (!projectName) {
    return [null, new ApiError('Project name is required')];
  }

  if (!pipelineId) {
    return [null, new ApiError('Pipeline ID is required')];
  }

  if (!executionId) {
    return [null, new ApiError('Execution ID is required')];
  }

  try {
    const path = `/workspaces/${workspace}/projects/${projectName}/pipelines/${pipelineId}/executions/${executionId}`;

    const [response, error] = await apiRequest<PipelineExecutionResponse>(path, {
      method: 'GET'
    });

    if (error) {
      return [null, error];
    }

    return [response as PipelineExecutionResponse, null];
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Get execution error: ${errorMsg}`);
    return [null, new ApiError(errorMsg)];
  }
}

/**
 * Get action execution details
 * Returns a Go-style [ApiResult, error] tuple
 *
 * @param projectName - The name/slug of the project
 * @param pipelineId - The ID of the pipeline
 * @param executionId - The ID of the execution
 * @param actionExecutionId - The ID of the action execution
 * @returns Tuple of [ActionExecutionResponse, null] on success or [null, ApiError] on failure
 */
export async function getActionExecution(
  projectName: string,
  pipelineId: number,
  executionId: number,
  actionExecutionId: string
): Promise<ApiResult<ActionExecutionResponse>> {
  const workspace = process.env.BUDDY_WORKSPACE;

  if (!workspace) {
    return [null, new ApiError('BUDDY_WORKSPACE environment variable is not set')];
  }

  if (!projectName) {
    return [null, new ApiError('Project name is required')];
  }

  if (!pipelineId) {
    return [null, new ApiError('Pipeline ID is required')];
  }

  if (!executionId) {
    return [null, new ApiError('Execution ID is required')];
  }

  if (!actionExecutionId) {
    return [null, new ApiError('Action Execution ID is required')];
  }

  try {
    const path = `/workspaces/${workspace}/projects/${projectName}/pipelines/${pipelineId}/executions/${executionId}/action_executions/${actionExecutionId}`;

    const [response, error] = await apiRequest<ActionExecutionResponse>(path, {
      method: 'GET'
    });

    if (error) {
      return [null, error];
    }

    return [response as ActionExecutionResponse, null];
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Get action execution error: ${errorMsg}`);
    return [null, new ApiError(errorMsg)];
  }
}

/**
 * Get details for all failed or terminated actions in an execution
 * Returns a Go-style [ApiResult, error] tuple
 *
 * @param projectName - The name/slug of the project
 * @param pipelineId - The ID of the pipeline
 * @param execution - The execution object
 * @returns Tuple of [ActionExecutionResponse[], null] on success or [null, ApiError] on failure
 */
export async function getFailedActionExecution(
  projectName: string,
  pipelineId: number,
  execution: PipelineExecutionResponse
): Promise<ApiResult<ActionExecutionResponse | null>> {
  if (!execution || !execution.id) {
    return [null, new ApiError('Valid execution object is required')];
  }

  if (!['FAILED'].includes(execution.status)) {
    // If execution is not failed or terminated, there are no failed actions to fetch
    return [null, null];
  }

  try {
    const failedActionsExecution = execution.action_executions.find(action => action.status === 'FAILED');
    if (failedActionsExecution) {
      const [fetchedActionExecution, error] = await getActionExecution(
        projectName,
        pipelineId,
        execution.id,
        failedActionsExecution?.action_execution_id
      );

      if (error) {
        return [null, error];
      }

      return [fetchedActionExecution, null];
    }

    return [null, null];
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Get failed actions error: ${errorMsg}`);
    return [null, new ApiError(errorMsg)];
  }
}

/**
 * Get details for publish package version action in an execution
 * Returns a Go-style [ApiResult, error] tuple
 *
 * @param projectName - The name/slug of the project
 * @param pipelineId - The ID of the pipeline
 * @param execution - The execution object
 * @returns Tuple of [ActionExecutionResponse, null] on success or [null, ApiError] on failure
 */
export async function getPublishPackageVersionActionExecution(
  projectName: string,
  pipelineId: number,
  execution: PipelineExecutionResponse
): Promise<ApiResult<ActionExecutionResponse | null>> {
  if (!execution || !execution.id) {
    return [null, new ApiError('Valid execution object is required')];
  }

  try {
    const publishPackageActionExecution = execution.action_executions.filter(action => action.action.type === 'PUBLISH_PACKAGE_VERSION').at(-1);
    if (publishPackageActionExecution) {
      const [fetchedActionExecution, error] = await getActionExecution(
        projectName,
        pipelineId,
        execution.id,
        publishPackageActionExecution.action_execution_id
      );

      if (error) {
        return [null, error];
      }

      return [fetchedActionExecution, null];
    }

    return [null, null];
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Get publish package version action error: ${errorMsg}`);
    return [null, new ApiError(errorMsg)];
  }
}

/**
 * Wait for a pipeline execution to complete (status different from ENQUEUED or INPROGRESS)
 * Returns a Go-style [ApiResult, error] tuple
 *
 * @param projectName - The name/slug of the project
 * @param pipelineId - The ID of the pipeline
 * @param executionId - The ID of the execution to wait for
 * @param options - Additional options (pollInterval in ms, timeout in ms)
 * @returns Tuple of [PipelineExecutionResponse, null] on success or [null, ApiError] on failure
 */
export async function waitForExecution(
  projectName: string,
  pipelineId: number,
  executionId: number,
  options: { pollInterval?: number; timeout?: number } = {}
): Promise<ApiResult<PipelineExecutionResponse>> {
  const {
    pollInterval = 5000, // Default poll interval: 5 seconds
    timeout = 600000     // Default timeout: 10 minutes
  } = options;

  const startTime = Date.now();
  const IN_PROGRESS_STATUSES = ['ENQUEUED', 'INPROGRESS'];

  while (Date.now() - startTime < timeout) {
    // Get current execution status
    const [execution, error] = await getExecution(projectName, pipelineId, executionId);

    if (error) {
      return [null, error];
    }

    logger.info(`Execution ${executionId} status: ${execution.status}`);

    // If execution is done, return it
    if (!IN_PROGRESS_STATUSES.includes(execution.status)) {
      return [execution, null];
    }

    // Sleep before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  return [null, new ApiError(`Timeout waiting for execution ${executionId} to complete`)];
}

/**
 * Run a pipeline in the specified project
 * Returns a Go-style [ApiResult, error] tuple
 *
 * @param projectName - The name/slug of the project
 * @param pipelineId - The ID of the pipeline to run
 * @param executionData - Execution configuration data
 * @returns Tuple of [PipelineExecutionResponse, null] on success or [null, ApiError] on failure
 */
export async function runPipeline(
  projectName: string,
  pipelineId: number,
  executionData: RunPipelineInput
): Promise<ApiResult<PipelineExecutionResponse>> {
  const workspace = process.env.BUDDY_WORKSPACE;

  if (!workspace) {
    return [null, new ApiError('BUDDY_WORKSPACE environment variable is not set')];
  }

  if (!projectName) {
    return [null, new ApiError('Project name is required')];
  }

  if (!pipelineId) {
    return [null, new ApiError('Pipeline ID is required')];
  }

  try {
    // Validate the input data
    const validatedData = RunPipelineInputSchema.parse(executionData);

    const path = `/workspaces/${workspace}/projects/${projectName}/pipelines/${pipelineId}/executions`;

    const [response, error] = await apiRequest<PipelineExecutionResponse>(path, {
      method: 'POST',
      body: validatedData
    });

    if (error) {
      return [null, error];
    }

    return [response as PipelineExecutionResponse, null];
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Run pipeline error: ${errorMsg}`);
    return [null, new ApiError(errorMsg)];
  }
}