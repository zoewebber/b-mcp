import { z } from 'zod';

export const WorkspaceResponseSchema = z.object({
  url: z.url(),
  html_url: z.url(),
  id: z.number(),
  name: z.string(),
  domain: z.string(),
});

export const WorkspacesResponseSchema = z.object({
  url: z.url(),
  html_url: z.url(),
  workspaces: WorkspaceResponseSchema.array(),
});

export type WorkspaceResponse = z.infer<typeof WorkspaceResponseSchema>;

export type WorkspacesResponse = z.infer<typeof WorkspacesResponseSchema>;
