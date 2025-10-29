import { z } from 'zod';

// Response schema for user
export const UserResponseSchema = z.object({
  url: z.string().url(),
  html_url: z.string().url(),
  id: z.number(),
  name: z.string(),
  avatar_url: z.string().url(),
  workspaces_url: z.string().url()
});

export type UserResponse = z.infer<typeof UserResponseSchema>;

// Input schema for adding an SSH key
export const AddSshKeyInputSchema = z.object({
  title: z.string(),
  content: z.string()
});

export type AddSshKeyInput = z.infer<typeof AddSshKeyInputSchema>;

// Response schema for SSH key
export const SshKeyResponseSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string().optional(),
  fingerprint: z.string().optional(),
  created_date: z.string().datetime(),
  html_url: z.string().url().optional()
});

export type SshKeyResponse = z.infer<typeof SshKeyResponseSchema>;