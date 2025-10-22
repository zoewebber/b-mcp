import { apiRequest } from '../api.js';
import { AddSshKeyInput, AddSshKeyInputSchema, SshKeyResponse } from '../../types/api/user.js';

export async function addSshKey(
  keyData: AddSshKeyInput,
  token: string
): Promise<SshKeyResponse> {
  const validatedData = AddSshKeyInputSchema.parse(keyData);

  return apiRequest<SshKeyResponse>('/user/keys', {
    method: 'POST',
    body: validatedData,
    token
  });
}