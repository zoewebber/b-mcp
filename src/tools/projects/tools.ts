import { FastMCP, UserError } from 'fastmcp';
import { AddProjectParams } from './types.js';
import { Config } from '../../lib/config.js';
import { ApiClient } from '../../lib/api/client.js';
import { MCPSession } from '../../types/server.js';
import getSessionToken from '../../lib/utils/getSessionToken.js';
import { to } from '../../lib/utils/to';

const registerTools = (server: FastMCP<MCPSession>) => {
  server.addTool({
    name: 'add-project',
    description: `Creates new project in Buddy platform.`,
    parameters: AddProjectParams,
    execute: async (args, { log, session }) => {
      const token = getSessionToken(session);
      const client = new ApiClient(token);

      const configService = new Config(args.projectRootDirectory);
      const config = configService.getConfig();

      if (!config.workspace) {
        throw new UserError('Workspace is not set. Please set it first by tool "set-workspace".');
      }

      if (config.project) {
        throw new UserError('Project is already created.');
      }
      const [project, createError] = await to(client.projects.create(
        { workspace: config.workspace },
        { display_name: args.projectName }
      ));

      if (createError) {
        log.error(createError.message);
        throw new UserError(`Failed to create project: ${createError.message}`);
      }

      configService.updateConfig({
        ...config,
        project: project.name,
        pipeline: 0,
        sandbox: ''
      });

      return 'Project created successfully. Now you can run "deploy" tool to deploy your application.';
    }
  });
};

export default { registerTools };