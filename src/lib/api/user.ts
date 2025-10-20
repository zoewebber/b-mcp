import { z } from 'zod';
import { apiRequest, ApiResult, ApiError } from '../api.js';
import logger from '../logger.js';

// Input schema for adding an SSH key
export const AddSshKeyInputSchema = z.object({
  title: z.string().describe('Name of the SSH key'),
  content: z.string().describe('Public key content')
});

export type AddSshKeyInput = z.infer<typeof AddSshKeyInputSchema>;

// Response schema for SSH key
export const SshKeyResponseSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string().optional(),
  fingerprint: z.string().optional(),
  created_date: z.string().datetime(),
  html_url: z.url().optional()
});

export type SshKeyResponse = z.infer<typeof SshKeyResponseSchema>;

/**
 * Add a new SSH key to the user's account
 * Returns a Go-style [ApiResult, error] tuple
 * 
 * @param keyData - SSH key data containing title and content
 * @returns Tuple of [SshKeyResponse, null] on success or [null, ApiError] on failure
 */
export async function addSshKey(
  keyData: AddSshKeyInput
): Promise<ApiResult<SshKeyResponse>> {
  try {
    // Validate the input data
    const validatedData = AddSshKeyInputSchema.parse(keyData);
    
    const path = '/user/keys';
    
    const [response, error] = await apiRequest<SshKeyResponse>(path, {
      method: 'POST',
      body: validatedData
    });
    
    if (error) {
      return [null, error];
    }

    return [response as SshKeyResponse, null];
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Add SSH key error: ${errorMsg}`);
    return [null, new ApiError(errorMsg)];
  }
}