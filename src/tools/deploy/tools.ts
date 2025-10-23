import { FastMCP, UserError } from 'fastmcp';
import { DeployParams } from './types.js';
import { Config } from '../../lib/config.js';
import { Git } from '../../lib/git.js';
import { ApiClient } from '../../lib/api/client.js';
import { ApiError } from '../../lib/api/client.js';
import { MCPSession } from '../../types/server.js';
import getSessionToken from '../../lib/utils/getSessionToken.js';
import { to } from '../../lib/utils/to.js';

const registerTools = (server: FastMCP<MCPSession>) => {
  server.addTool({
    name: 'deploy',
    description: 'Deploys application to Buddy platform by committing changes, pushing to repository, and triggering pipeline execution. Required for deploying code modifications.',
    parameters: DeployParams,
    execute: async (args, { log, session }) => {
      const token = getSessionToken(session);
      const client = new ApiClient(token);
      const configService = new Config(args.projectRootDirectory);
      const gitService = new Git(args.projectRootDirectory, token);

      const config = configService.getConfig();

      if (!config.workspace) {
        throw new UserError('Workspace is not set. Please set it first by tool "set-workspace".');
      }

      if (!config.project) {
        throw new UserError('Project is not created. Please create it first by tool "add-project".');
      }

      const [project, projectError] = await to(client.projects.get({
        workspace: config.workspace,
        project: config.project
      }));

      if (projectError || !project) {
        if ((projectError as ApiError)?.statusCode === 404) {
          throw new UserError(`Project "${config.project}" not found. Please create it first by tool "add-project".`);
        }
        throw new UserError(`Error with getting project: ${projectError?.message}. Please create new project by tool "add-project".`);
      }

      if (!config.appType) {
        config.appType = args.appType;
        configService.updateConfig(config);
      } else if (config.appType !== args.appType) {
        config.appType = args.appType;
        config.sandbox = '';
        config.pipeline = 0;
        configService.updateConfig(config);
      }

      if (config.appType === 'dynamic' && !config.sandbox) {
        throw new UserError('Sandbox is not created. Please create it first by tool "add-sandbox".');
      }

      if (!config.pipeline) {
        const tool = config.appType === 'dynamic' ? 'add-pipeline' : 'add-pipeline-static';
        throw new UserError(`Pipeline is not created. Please create it first by tool "${tool}".`);
      }

      const [isInitialized, initError] = await to(gitService.isInitialized());
      if (initError) {
        log.error(initError.message);
        throw new UserError(`Git initialization check failed: ${initError.message}`);
      }

      if (!isInitialized) {
        const [, repoInitError] = await to(gitService.initRepo());
        if (repoInitError) {
          log.error(repoInitError.message);
          throw new UserError(`Failed to init repo: ${repoInitError.message}`);
        }
      }

      const [, remoteError] = await to(gitService.ensureRemote(project.http_repository));
      if (remoteError) {
        log.error(remoteError.message);
        throw new UserError(`Failed to ensure remote: ${remoteError.message}`);
      }

      const [currentBranch, branchError] = await to(gitService.getCurrentBranch());
      if (branchError) {
        log.error(branchError.message);
        throw new UserError(`Failed to get current branch: ${branchError.message}`);
      }

      log.info(`Current branch: ${currentBranch}`);

      // Check for any uncommitted changes
      const [status, statusError] = await to(gitService.getStatus());
      if (statusError) {
        log.error(statusError.message);
        throw new UserError(`Failed to get git status: ${statusError.message}`);
      }

      // If there are uncommitted changes, add and commit them
      let commitHash = '';
      if (status && (status.not_added.length > 0 || status.modified.length > 0 || status.deleted.length > 0)) {
        const message = args.commitMessage || 'Automatic commit before deployment';
        const [hash, commitError] = await to(gitService.addAndCommit(message));

        if (commitError) {
          log.error(commitError.message);
          throw new UserError(`Failed to commit changes: ${commitError.message}`);
        }

        commitHash = hash!;
        log.info(`Changes committed with hash: ${commitHash}`);
      } else {
        // Get the current commit hash if no new commits were made
        const [hash, hashError] = await to(gitService.getCurrentCommitHash());
        if (hashError) {
          log.error(hashError.message);
          throw new UserError(`Failed to get current commit hash: ${hashError.message}`);
        }
        commitHash = hash!;
        log.info(`Current commit hash: ${commitHash}`);
      }

      // Push changes to remote
      if (currentBranch) {
        const [, pushError] = await to(gitService.push('origin', currentBranch));

        if (pushError) {
          log.error(pushError.message);
          throw new UserError(`Failed to push changes: ${pushError.message}`);
        }

        // Wait for the commit to appear in Buddy's repository
        log.info(`Waiting for commit ${commitHash} to be available in Buddy repository...`);

        const [, commitError] = await to(client.source.waitForCommit({
          workspace: config.workspace,
          project: config.project,
          revision: commitHash
        }));

        if (commitError) {
          log.error(commitError.message);
          throw new UserError(`Failed to verify commit in Buddy repository: ${commitError.message}`);
        }

        log.info(`Commit ${commitHash} is now available in Buddy. Proceeding to pipeline execution.`);
      }

      const [execution, executionError] = await to(client.pipelines.run(
        { workspace: config.workspace, project: config.project, pipelineId: config.pipeline },
        {
          to_revision: {
            revision: commitHash
          },
          branch: { name: currentBranch || '' },
        }
      ));

      if (executionError) {
        log.error(executionError.message);
        throw new UserError(`Failed to run pipeline: ${executionError.message}`);
      }

      const [finishedExecution, waitForError] = await to(client.pipelines.waitForExecution({
        workspace: config.workspace,
        project: config.project,
        pipelineId: config.pipeline,
        executionId: execution!.id
      }));

      if (waitForError) {
        log.error(waitForError.message);
        throw new UserError(`Something went wrong during execution: ${waitForError.message}`);
      }

      if (finishedExecution!.status === 'FAILED') {
        // Try to get details for failed actions
        const [failedActionExecution, actionError] = await to(client.pipelines.getFailedActionExecution(
          { workspace: config.workspace, project: config.project, pipelineId: config.pipeline },
          finishedExecution!
        ));

        if (actionError) {
          log.error(actionError.message);
          throw new UserError(`Execution failed with status: ${finishedExecution!.status}. Unable to retrieve details: ${actionError.message}`);
        }

        // If we have failed action details, include them in the message
        let failureMessage = `Execution failed with status: ${finishedExecution!.status} on action ${failedActionExecution?.action?.name}. Analyze logs and update pipeline or sandbox to fix the issue.\n\n Here are the details from logs (last 100 lines):\n`;
        if (failedActionExecution) {
          failureMessage += `${failedActionExecution.log?.slice(-100).join('\n')}\n\n`;
        } else {
          failureMessage += 'No detailed failure information available.';
        }

        throw new UserError(failureMessage);
      }

      if (finishedExecution!.status === 'TERMINATED') {
        throw new UserError('Execution terminated.');
      }

      if (config.appType === 'dynamic') {
        log.info(`Checking app status for sandbox ${config.sandbox}...`);

        const [sandbox, sandboxError] = await to(client.sandboxes.get({
          workspace: config.workspace,
          project: config.project,
          sandboxId: config.sandbox
        }));

        if (sandboxError) {
          log.error(sandboxError.message);
          throw new UserError(`Deployment successful but failed to check app status: ${sandboxError.message}`);
        }

        // Check if the sandbox app status is FAILED
        if (sandbox && sandbox.app_status && sandbox.app_status === 'FAILED') {
          log.info('App status is FAILED, retrieving app logs...');

          const [appLogs, logsError] = await to(client.sandboxes.getAppLogs({
            workspace: config.workspace,
            project: config.project,
            sandboxId: config.sandbox
          }));

          if (logsError) {
            log.error(logsError.message);
            throw new UserError(`Deployment successful but app status is FAILED. Unable to retrieve app logs: ${logsError.message}`);
          }

          throw new UserError(`Deployment successful but app status is FAILED. Check the app logs below, analyze it and update configuration:\n\n${appLogs!.logs.slice(-50).join('\n')}`);
        }

        const urls = client.sandboxes.generatePreviewUrls(sandbox!);
        return `Successfully deployed application to Buddy. You can check your application at the following URL:\n${urls[0]}`;
      } else if (config.appType === 'static') {
        const [publishPackageActionExecution, actionExecutionError] = await to(client.pipelines.getPublishPackageVersionActionExecution(
          { workspace: config.workspace, project: config.project, pipelineId: config.pipeline },
          finishedExecution!
        ));

        if (actionExecutionError) {
          log.error(actionExecutionError.message);
          throw new UserError(`Execution finished successfully, but I'm unable to get preview url: ${actionExecutionError.message}`);
        }

        const packageUrl = publishPackageActionExecution?.outputted_variables?.find(v => v.key === 'BUDDY_PACKAGE_ACTION_VERSION_URL')?.value;
        if (!packageUrl) {
          throw new UserError(`Execution finished successfully, but I'm unable to get preview url. Please check the pipeline logs for more details.`);
        }

        return `Successfully deployed application to Buddy. You can check your application at the following URL:\n${packageUrl}`;
      }

      throw new UserError('Missing application type');
    }
  });
};

export default { registerTools };
