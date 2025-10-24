import { FastMCP, UserError } from 'fastmcp';
import { AddSandboxParams } from './types.js';
import { Config } from '../../lib/config.js';
import { ApiClient } from '../../lib/api/client.js';
import { MCPSession } from '../../types/server.js';
import getSessionToken from '../../lib/utils/getSessionToken.js';
import { to } from '../../lib/utils/to.js';
import { generateSandboxYaml } from '../../lib/utils/sandboxYaml.js';

const registerTools = (server: FastMCP<MCPSession>) => {
  server.addTool({
    name: 'add-sandbox',
    description: 'Creates sandbox for the dynamic application. It should be configure based on files and the framework used.',
    parameters: AddSandboxParams,
    execute: async (args, { log, session }) => {
      const token = getSessionToken(session);
      const client = new ApiClient(token);
      const configService = new Config(args.projectRootDirectory);
      const config = configService.getConfig();

      if (!config.workspace) {
        throw new UserError('Workspace is not set. Please set it first by tool "set-workspace".');
      }

      if (!config.project) {
        throw new UserError('Project is not created. Please create it first by tool "add-project".');
      }

      if (!config.appType) {
        throw new UserError('Application type is not set. Please set it first by tool "deploy".');
      }

      if (config.appType === 'static') {
        throw new UserError('Static application does not require sandbox. Please run "deploy" tool to deploy your static application.');
      }

      if (config.sandbox) {
        throw new UserError('Sandbox is already created.');
      }

      const base64Yaml = generateSandboxYaml(args);
      const [sandbox, createError] = await to(client.sandboxes.createByYaml(
        { workspace: config.workspace, project_name: config.project },
        base64Yaml
      ));

      if (createError) {
        log.error(createError.message);
        throw new UserError(`Failed to create sandbox: ${createError.message}`);
      }

      if (!sandbox) {
        throw new UserError('Failed to create sandbox: unknown error');
      }

      // Save the sandbox ID to the configuration
      configService.updateConfig({
        ...config,
        sandbox: sandbox.id,
      });

      // Wait for the sandbox to finish setting up
      log.info(`Waiting for sandbox ${sandbox.id} to finish initialization...`);
      const [readySandbox, waitError] = await to(client.sandboxes.waitForReady(
        { workspace: config.workspace, sandbox_id: sandbox.id, project_name: config.project }
      ));

      if (waitError) {
        log.error(waitError.message);
        throw new UserError(`Sandbox created but failed to initialize: ${waitError.message}`);
      }

      if (readySandbox?.setup_status === 'FAILED') {
        const bootLogs = readySandbox.boot_logs?.slice(-100).join('\n') || 'No logs available';
        throw new UserError(`Sandbox created but failed to initialize. Status: ${readySandbox.status}. Analyze logs and update sandbox to fix the issue.\n\n Here are the details from logs (last 100 lines):\n${bootLogs}\n\n`);
      }

      return `Sandbox created successfully with ID: ${sandbox.id}. Status: ${readySandbox?.status}`;
    }
  });

  server.addTool({
    name: 'update-sandbox',
    description: 'Modifies existing sandbox configuration for the dynamic application.',
    parameters: AddSandboxParams,
    execute: async (args, { log, session }) => {
      const token = getSessionToken(session);
      const client = new ApiClient(token);
      const configService = new Config(args.projectRootDirectory);
      const config = configService.getConfig();

      if (!config.workspace) {
        throw new UserError('Workspace is not set. Please set it first by tool "set-workspace".');
      }

      if (!config.project) {
        throw new UserError('Project is not created. Please create it first by tool "add-project".');
      }

      if (!config.appType) {
        throw new UserError('Application type is not set. Please set it first by tool "deploy".');
      }

      if (config.appType === 'static') {
        throw new UserError('Static application does not require sandbox. Please run "deploy" tool to deploy your static application.');
      }

      if (!config.sandbox) {
        throw new UserError('Sandbox is not created. Please create it first by tool "add-sandbox".');
      }

      const base64Yaml = generateSandboxYaml(args);
      const [sandbox, updateError] = await to(client.sandboxes.updateByYaml(
        { workspace: config.workspace, sandbox_id: config.sandbox, project_name: config.project },
        base64Yaml
      ));

      if (updateError) {
        log.error(updateError.message);
        throw new UserError(`Failed to update sandbox: ${updateError.message}`);
      }

      if (!sandbox) {
        throw new UserError('Failed to update sandbox: unknown error');
      }

      // Wait for the sandbox to finish setting up
      log.info(`Waiting for sandbox ${config.sandbox} to finish initialization after update...`);
      const [readySandbox, waitError] = await to(client.sandboxes.waitForReady(
        { workspace: config.workspace, sandbox_id: config.sandbox, project_name: config.project }
      ));

      if (waitError) {
        log.error(waitError.message);
        throw new UserError(`Sandbox updated but failed to initialize: ${waitError.message}`);
      }

      if (readySandbox?.setup_status === 'FAILED') {
        const bootLogs = readySandbox.boot_logs?.slice(-100).join('\n') || 'No logs available';
        throw new UserError(`Sandbox updated but failed to initialize. Status: ${readySandbox.status}. Analyze logs and update sandbox to fix the issue.\n\n Here are the details from logs (last 100 lines):\n${bootLogs}\n\n`);
      }

      return `Sandbox updated and restarted successfully with ID: ${config.sandbox}. Status: ${readySandbox?.status}`;
    }
  });
};

export default { registerTools };
