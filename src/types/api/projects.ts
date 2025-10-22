import { z } from 'zod';

export const CreateProjectInputSchema = z.object({
  name: z.string().optional(),
  display_name: z.string(),
  access: z.enum(['PUBLIC', 'PRIVATE']).default('PRIVATE').optional(),
  fetch_submodules: z.boolean().default(false).optional(),
  fetch_submodules_env_key: z.string().optional(),
  allow_pull_requests: z.boolean().default(true).optional(),
});

export const UserSchema = z.object({
  url: z.url(),
  html_url: z.url(),
  id: z.number(),
  name: z.string(),
  avatar_url: z.url()
});

export const ProjectResponseSchema = z.object({
  url: z.url(),
  html_url: z.url(),
  name: z.string(),
  display_name: z.string().optional(),
  status: z.string(),
  create_date: z.iso.date(),
  created_by: UserSchema,
  http_repository: z.url(),
  ssh_repository: z.string(),
  default_branch: z.string(),
  access: z.enum(['PUBLIC', 'PRIVATE']),
  fetch_submodules: z.boolean(),
  fetch_submodules_env_key: z.string().optional(),
  allow_pull_requests: z.boolean()
});


export const CommitResponseSchema = z.object({
  url: z.url(),
  html_url: z.url().optional(),
  revision: z.string(),
  short_revision: z.string(),
  author_name: z.string(),
  author_email: z.string().email(),
  message: z.string(),
  create_date: z.iso.date()
});


export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;

export type ProjectResponse = z.infer<typeof ProjectResponseSchema>;

export type CommitResponse = z.infer<typeof CommitResponseSchema>;
