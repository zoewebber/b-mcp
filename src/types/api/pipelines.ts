import { z } from 'zod';

export const CreatePipelineInputSchema = z.object({
  name: z.string()
});

export const RunPipelineInputSchema = z.object({
  to_revision: z.object({
    revision: z.string()
  }),
  branch: z.object({
    name: z.string(),
  }).optional(),
  comment: z.string().optional(),
});

export const PipelineResponseSchema = z.object({
  url: z.string().url(),
  html_url: z.string().url(),
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

export const ActionExecutionResponseSchema = z.object({
  status: z.string(),
  progress: z.number(),
  action_execution_id: z.string(),
  action: z.object({
    id: z.number(),
    name: z.string(),
    type: z.string(),
    url: z.string().url(),
    html_url: z.string().url()
  }),
  start_date: z.string().datetime(),
  finish_date: z.string().datetime(),
  log: z.array(z.string()),
  outputted_variables: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
});

export const PipelineExecutionResponseSchema = z.object({
  url: z.string().url(),
  html_url: z.string().url().optional(),
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


export type CreatePipelineInput = z.infer<typeof CreatePipelineInputSchema>;
export type RunPipelineInput = z.infer<typeof RunPipelineInputSchema>;
export type PipelineResponse = z.infer<typeof PipelineResponseSchema>;
export type ActionExecutionResponse = z.infer<typeof ActionExecutionResponseSchema>;
export type PipelineExecutionResponse = z.infer<typeof PipelineExecutionResponseSchema>;