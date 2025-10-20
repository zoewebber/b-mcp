import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import { FetchResult, simpleGit, SimpleGit, StatusResult } from 'simple-git';
import { Logger } from 'fastmcp';

export class GitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitError';
  }
}

export type Result<T> = [T, null] | [null, GitError];

export class GitService {
  private git: SimpleGit;
  private readonly repoPath: string;
  private readonly token: string;
  private logger: Logger;

  constructor(repoPath: string, token: string, logger: Logger) {
    this.repoPath = repoPath;
    this.token = token;
    this.logger = logger;
    this.git = simpleGit({
      baseDir: repoPath,
      trimmed: false,
    });
    this.git.addConfig('http.sslVerify', 'false'); // Disable SSL verification for simplicity
  }

  /**
   * Checks if the repository is initialized (has a .git folder)
   * @returns A Result tuple with boolean indicating if the repository is initialized
   */
  async isInitialized(): Promise<Result<boolean>> {
    try {
      const gitDirPath = path.join(this.repoPath, '.git');
      const initialized = fs.existsSync(gitDirPath) && fs.statSync(gitDirPath).isDirectory();
      return [initialized, null];
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Git initialization check error: ${errorMsg}`);
      return [null, new GitError(errorMsg)];
    }
  }

  /**
   * Gets the current status of the git repository
   * @returns Result tuple with git status object containing information about current branch,
   * staged changes, unstaged changes, etc.
   */
  async getStatus(): Promise<Result<StatusResult>> {
    const [initialized, initError] = await this.isInitialized();

    if (initError) {
      return [null, initError];
    }

    if (!initialized) {
      return [null, new GitError('Git repository is not initialized')];
    }

    try {
      const status = await this.git.status();
      return [status, null];
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Git status error: ${errorMsg}`);
      return [null, new GitError(errorMsg)];
    }
  }

  /**
   * Gets all remotes for the repository
   * @returns Result tuple with an array of remote objects with name and url properties
   */
  async getRemotes(): Promise<Result<{ name: string; url: string }[]>> {
    const [initialized, initError] = await this.isInitialized();

    if (initError) {
      return [null, initError];
    }

    if (!initialized) {
      return [null, new GitError('Git repository is not initialized')];
    }

    try {
      const remotes = await this.git.getRemotes(true);
      const formattedRemotes = remotes.map(remote => ({
        name: remote.name,
        url: remote.refs.fetch
      }));
      return [formattedRemotes, null];
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Git get remotes error: ${errorMsg}`);
      return [null, new GitError(errorMsg)];
    }
  }

  /**
   * Adds a new remote to the repository
   * @param name The name of the remote
   * @param url The URL of the remote
   * @returns Result tuple with void on success or error on failure
   */
  async addRemote(name: string, url: string): Promise<Result<void>> {
    const [initialized, initError] = await this.isInitialized();

    if (initError) {
      return [null, initError];
    }

    if (!initialized) {
      return [null, new GitError('Git repository is not initialized')];
    }

    try {
      await this.git.addRemote(name, url);
      return [undefined, null];
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Git add remote error: ${errorMsg}`);
      return [null, new GitError(errorMsg)];
    }
  }

  /**
   * Removes a remote from the repository
   * @param name The name of the remote
   * @returns Result tuple with void on success or error on failure
   */
  async removeRemote(name: string): Promise<Result<void>> {
    const [initialized, initError] = await this.isInitialized();

    if (initError) {
      return [null, initError];
    }

    if (!initialized) {
      return [null, new GitError('Git repository is not initialized')];
    }

    try {
      await this.git.removeRemote(name);
      return [undefined, null];
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Git remove remote error: ${errorMsg}`);
      return [null, new GitError(errorMsg)];
    }
  }

  /**
   * Pushes local changes to a remote repository
   * @param remote The remote to push to (defaults to 'origin')
   * @param branch The branch to push (defaults to current branch)
   * @param options Push options like --force, --tags, etc.
   * @returns Result tuple with void on success or error on failure
   */
  async push(remote: string = 'origin', branch?: string, options?: string[]): Promise<Result<void>> {
    const [initialized, initError] = await this.isInitialized();

    if (initError) {
      return [null, initError];
    }

    if (!initialized) {
      return [null, new GitError('Git repository is not initialized')];
    }

    try {
      await this.git.push(remote, branch, options);
      return [undefined, null];
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Git push error: ${errorMsg}`);
      return [null, new GitError(errorMsg)];
    }
  }

  /**
   * Fetches updates from a remote repository
   * @param remote The remote to fetch from (defaults to 'origin')
   * @param branch The branch to fetch (if not specified, fetches all branches)
   * @param options Fetch options like --prune, --tags, etc.
   * @returns Result tuple with FetchResult on success or error on failure
   */
  async fetch(remote: string = 'origin', branch?: string, options?: string[]): Promise<Result<FetchResult>> {
    const [initialized, initError] = await this.isInitialized();

    if (initError) {
      return [null, initError];
    }

    if (!initialized) {
      return [null, new GitError('Git repository is not initialized')];
    }

    try {
      let result;

      if (branch) {
        result = await this.git.fetch(remote, branch, options);
      } else {
        result = await this.git.fetch(remote, options);
      }

      return [result, null];
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Git fetch error: ${errorMsg}`);
      return [null, new GitError(errorMsg)];
    }
  }

  /**
   * Gets the current branch
   * @returns Result tuple with current branch name on success or error on failure
   */
  async getCurrentBranch(): Promise<Result<string>> {
    const [initialized, initError] = await this.isInitialized();

    if (initError) {
      return [null, initError];
    }

    if (!initialized) {
      return [null, new GitError('Git repository is not initialized')];
    }

    try {
      const status = await this.git.status();
      // Ensure status.current is not null
      if (!status.current) {
        return [null, new GitError('No current branch found')];
      }
      return [status.current, null];
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Git get current branch error: ${errorMsg}`);
      return [null, new GitError(errorMsg)];
    }
  }

  /**
   * Initialize a new git repository
   * @returns Result tuple with success boolean or error
   */
  async initRepo(): Promise<Result<boolean>> {
    const [initialized, initError] = await this.isInitialized();

    if (initError) {
      return [null, initError];
    }

    // Repository already initialized
    if (initialized) {
      return [true, null];
    }

    try {
      // Initialize a new repository
      await this.git.init();
      this.logger.info('Git repository initialized');
      return [true, null];
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Git init error: ${errorMsg}`);
      return [null, new GitError(errorMsg)];
    }
  }

  /**
   * Ensures remote 'origin' exists with the correct URL
   * @param url The URL for the remote
   * @returns Result tuple with void on success or error on failure
   */
  async ensureRemote(url: string): Promise<Result<void>> {
    const [remotes, remotesError] = await this.getRemotes();

    if (remotesError) {
      return [null, remotesError];
    }

    try {
      const origin = remotes.find(r => r.name === 'origin');

      const remoteUrl = new URL(url);
      remoteUrl.username = this.token;

      if (origin?.url !== remoteUrl.toString()) {
        if (origin) {
          const [, removeError] = await this.removeRemote('origin');
          if (removeError) {
            return [null, removeError];
          }
        }

        const [, addError] = await this.addRemote('origin', remoteUrl.toString());
        if (addError) {
          return [null, addError];
        }
      }

      return [undefined, null];
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Git ensure remote error: ${errorMsg}`);
      return [null, new GitError(errorMsg)];
    }
  }

  /**
   * Adds all changes and creates a commit with the given message
   * @param message The commit message
   * @param filePatterns Optional specific file patterns to add (defaults to all changes)
   * @returns Result tuple with commit hash on success or error on failure
   */
  async addAndCommit(message: string, filePatterns: string[] = ['.']): Promise<Result<string>> {
    const [initialized, initError] = await this.isInitialized();

    if (initError) {
      return [null, initError];
    }

    if (!initialized) {
      return [null, new GitError('Git repository is not initialized')];
    }

    try {
      // Add all specified files (or all changes if not specified)
      await this.git.add(filePatterns);

      // Create the commit
      const commitResult = await this.git.commit(message);

      // Return the commit hash
      return [commitResult.commit, null];
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Git add and commit error: ${errorMsg}`);
      return [null, new GitError(errorMsg)];
    }
  }

  /**
   * Gets the current commit hash
   * @returns Result tuple with commit hash on success or error on failure
   */
  async getCurrentCommitHash(): Promise<Result<string>> {
    const [initialized, initError] = await this.isInitialized();

    if (initError) {
      return [null, initError];
    }

    if (!initialized) {
      return [null, new GitError('Git repository is not initialized')];
    }

    try {
      // Get the hash of the current HEAD
      const logResult = await this.git.log({ maxCount: 1 });

      if (!logResult.latest || !logResult.latest.hash) {
        return [null, new GitError('No commit found in repository')];
      }

      // Return the commit hash
      return [logResult.latest.hash, null];
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Git get current commit hash error: ${errorMsg}`);
      return [null, new GitError(errorMsg)];
    }
  }
}