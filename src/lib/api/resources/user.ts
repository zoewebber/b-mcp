import { AddSshKeyInput, AddSshKeyInputSchema, SshKeyResponse } from '../../../types/api/user.js';
import type { ApiClient } from '../client.js';

export class UserApi {
  constructor(private client: ApiClient) {}

  async addSshKey(keyData: AddSshKeyInput): Promise<SshKeyResponse> {
    const validatedData = AddSshKeyInputSchema.parse(keyData);

    return this.client.request<SshKeyResponse>('/user/keys', {
      method: 'POST',
      body: validatedData,
    });
  }
}