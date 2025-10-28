import { z } from 'zod';

export const SshSettingsSchema = z.object({
  ssh_id: z.string(),
});

export const SandboxEndpointSchema = z.object({
  type: z.string(),
  subdomain: z.string(),
  domain: z.string(),
  region: z.string(),
  port: z.number().optional(),
  ssh_settings: SshSettingsSchema.optional(),
});

export const SandboxResponseSchema = z.object({
  identifier: z.string(),
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  html_url: z.string().url(),
  created_date: z.string().datetime(),
  last_updated_date: z.string().datetime().optional(),
  status: z.string(),
  setup_status: z.string(),
  description: z.string().optional(),
  boot_logs: z.array(z.string()),
  app_status: z.enum(['ACTIVE', 'INACTIVE', 'FAILED']).optional(),
  endpoints: z.array(SandboxEndpointSchema).optional(),
});

export type SandboxResponse = z.infer<typeof SandboxResponseSchema>;

export const SandboxStatus = {
  STARTING: 'STARTING',
  RUNNING: 'RUNNING',
  FAILED: 'FAILED',
  STOPPED: 'STOPPED'
} as const;

export type SandboxStatusType = typeof SandboxStatus[keyof typeof SandboxStatus];

export const AppLogsResponseSchema = z.object({
  logs: z.array(z.string()),
});

export type AppLogsResponse = z.infer<typeof AppLogsResponseSchema>;