import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import { FetchResult, simpleGit, SimpleGit, StatusResult } from 'simple-git';
import logger from './logger.js';

export class GitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitError';
  }
}

export class Git {
  private git: SimpleGit;
  private readonly repoPath: string;
  private readonly token: string;

  constructor(repoPath: string, token: string) {
    this.repoPath = repoPath;
    this.token = token;
    this.git = simpleGit({
      baseDir: repoPath,
      trimmed: false,
    });
    this.git.addConfig('http.sslVerify', 'false'); // Disable SSL verification for simplicity
  }

  /**
   * Checks if the repository is initialized (has a .git folder)
   * @returns Boolean indicating if the repository is initialized
   */
  async isInitialized(): Promise<boolean> {
    const gitDirPath = path.join(this.repoPath, '.git');
    return fs.existsSync(gitDirPath) && fs.statSync(gitDirPath).isDirectory();
  }

  /**
   * Gets the current status of the git repository
   * @returns Git status object containing information about current branch, staged changes, unstaged changes, etc.
   * @throws {GitError} If repository is not initialized
   */
  async getStatus(): Promise<StatusResult> {
    const initialized = await this.isInitialized();

    if (!initialized) {
      throw new GitError('Git repository is not initialized');
    }

    return await this.git.status();
  }

  /**
   * Gets all remotes for the repository
   * @returns Array of remote objects with name and url properties
   * @throws {GitError} If repository is not initialized
   */
  async getRemotes(): Promise<{ name: string; url: string }[]> {
    const initialized = await this.isInitialized();

    if (!initialized) {
      throw new GitError('Git repository is not initialized');
    }

    const remotes = await this.git.getRemotes(true);
    return remotes.map(remote => ({
      name: remote.name,
      url: remote.refs.fetch
    }));
  }

  /**
   * Adds a new remote to the repository
   * @param name The name of the remote
   * @param url The URL of the remote
   * @throws {GitError} If repository is not initialized
   */
  async addRemote(name: string, url: string): Promise<void> {
    const initialized = await this.isInitialized();

    if (!initialized) {
      throw new GitError('Git repository is not initialized');
    }

    await this.git.addRemote(name, url);
  }

  /**
   * Removes a remote from the repository
   * @param name The name of the remote
   * @throws {GitError} If repository is not initialized
   */
  async removeRemote(name: string): Promise<void> {
    const initialized = await this.isInitialized();

    if (!initialized) {
      throw new GitError('Git repository is not initialized');
    }

    await this.git.removeRemote(name);
  }

  /**
   * Pushes local changes to a remote repository
   * @param remote The remote to push to (defaults to 'origin')
   * @param branch The branch to push (defaults to current branch)
   * @param options Push options like --force, --tags, etc.
   * @throws {GitError} If repository is not initialized
   */
  async push(remote: string = 'origin', branch?: string, options?: string[]): Promise<void> {
    const initialized = await this.isInitialized();

    if (!initialized) {
      throw new GitError('Git repository is not initialized');
    }

    await this.git.push(remote, branch, options);
  }

  /**
   * Fetches updates from a remote repository
   * @param remote The remote to fetch from (defaults to 'origin')
   * @param branch The branch to fetch (if not specified, fetches all branches)
   * @param options Fetch options like --prune, --tags, etc.
   * @returns FetchResult object with fetch details
   * @throws {GitError} If repository is not initialized
   */
  async fetch(remote: string = 'origin', branch?: string, options?: string[]): Promise<FetchResult> {
    const initialized = await this.isInitialized();

    if (!initialized) {
      throw new GitError('Git repository is not initialized');
    }

    if (branch) {
      return await this.git.fetch(remote, branch, options);
    } else {
      return await this.git.fetch(remote, options);
    }
  }

  /**
   * Gets the current branch
   * @returns Current branch name
   * @throws {GitError} If repository is not initialized or no current branch found
   */
  async getCurrentBranch(): Promise<string> {
    const initialized = await this.isInitialized();

    if (!initialized) {
      throw new GitError('Git repository is not initialized');
    }

    const status = await this.git.status();
    if (!status.current) {
      throw new GitError('No current branch found');
    }
    return status.current;
  }

  /**
   * Initialize a new git repository
   */
  async initRepo(): Promise<void> {
    const initialized = await this.isInitialized();

    // Repository already initialized
    if (initialized) {
      return;
    }

    await this.git.init();
    logger.info('Git repository initialized');
  }

  /**
   * Ensures remote 'origin' exists with the correct URL
   * @param url The URL for the remote
   */
  async ensureRemote(url: string): Promise<void> {
    const remotes = await this.getRemotes();
    const origin = remotes.find(r => r.name === 'origin');

    const remoteUrl = new URL(url);
    remoteUrl.username = this.token;

    if (origin?.url !== remoteUrl.toString()) {
      if (origin) {
        await this.removeRemote('origin');
      }

      await this.addRemote('origin', remoteUrl.toString());
    }
  }

  /**
   * Adds all changes and creates a commit with the given message
   * @param message The commit message
   * @param filePatterns Optional specific file patterns to add (defaults to all changes)
   * @returns Commit hash
   * @throws {GitError} If repository is not initialized
   */
  async addAndCommit(message: string, filePatterns: string[] = ['.']): Promise<string> {
    const initialized = await this.isInitialized();

    if (!initialized) {
      throw new GitError('Git repository is not initialized');
    }

    // Add all specified files (or all changes if not specified)
    await this.git.add(filePatterns);

    // Create the commit
    const commitResult = await this.git.commit(message);

    // Return the commit hash
    return commitResult.commit;
  }

  /**
   * Gets the current commit hash
   * @returns Current commit hash
   * @throws {GitError} If repository is not initialized or no commit found
   */
  async getCurrentCommitHash(): Promise<string> {
    const initialized = await this.isInitialized();

    if (!initialized) {
      throw new GitError('Git repository is not initialized');
    }

    // Get the hash of the current HEAD
    const logResult = await this.git.log({ maxCount: 1 });

    if (!logResult.latest || !logResult.latest.hash) {
      throw new GitError('No commit found in repository');
    }

    // Return the commit hash
    return logResult.latest.hash;
  }
}
