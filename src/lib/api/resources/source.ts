import logger from '../../logger.js';
import { to } from '../../utils/to.js';
import sleep from '../../utils/sleep.js';
import { CommitResponse } from '../../../types/api/projects.js';
import type { ApiClient } from '../client.js';
import { ApiError } from '../client.js';
import { preparePath } from '../utils/preparePath.js';

export class SourceApi {
  constructor(private client: ApiClient) {}

  async getCommit(pathParams: { workspace: string; project: string; revision: string }): Promise<CommitResponse> {
    return this.client.request<CommitResponse>(
      preparePath('/workspaces/:workspace/projects/:project/repository/commits/:revision', pathParams)
    );
  }

  /**
   * Wait until a commit is detected in the Buddy repository
   * Will poll the API with exponential backoff until the commit is found or timeout is reached
   */
  async waitForCommit(
    pathParams: { workspace: string; project: string; revision: string },
    options: {
      maxAttempts?: number;
      initialDelayMs?: number;
      maxDelayMs?: number;
    } = {}
  ): Promise<CommitResponse> {
    const {
      maxAttempts = 10,
      initialDelayMs = 1000,
      maxDelayMs = 10000
    } = options;

    let attempts = 0;
    let delay = initialDelayMs;

    while (attempts < maxAttempts) {
      attempts++;

      // Check if the commit exists
      const [commit, error] = await to(this.getCommit(pathParams));

      // If found, return it
      if (commit && !error) {
        return commit;
      }

      // If error is not 404 (not found), return the error
      if (error && (error as ApiError)?.statusCode !== 404) {
        throw error;
      }

      logger.info(`Commit ${pathParams.revision.substring(0, 8)} not yet found in Buddy repository. Attempt ${attempts}/${maxAttempts}, waiting ${delay}ms before next check...`);

      await sleep(delay);

      // Exponential backoff with max limit
      delay = Math.min(delay * 2, maxDelayMs);
    }

    throw new Error(`Timeout reached: Commit ${pathParams.revision} was not found in repository after ${maxAttempts} attempts`);
  }
}