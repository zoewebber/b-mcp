import { z } from 'zod';

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
  created_date: z.iso.date(),
  html_url: z.url().optional()
});

export type SshKeyResponse = z.infer<typeof SshKeyResponseSchema>;