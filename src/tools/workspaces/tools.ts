import { FastMCP, UserError } from 'fastmcp';
import { SetWorkspaceParams } from './types.js';
import { ConfigService } from '../../services/config.js';
import { ApiClient } from '../../lib/api/client.js';
import { MCPSession } from '../../types/server.js';
import getSessionToken from '../../lib/getSessionToken.js';
import { to } from '../../lib/to';

const registerTools = (server: FastMCP<MCPSession>) => {
  server.addTool({
    name: 'set-workspace',
    description: `Set the workspace where all operations will be performed.`,
    parameters: SetWorkspaceParams,
    execute: async (args, { session }) => {
      const token = getSessionToken(session);
      const client = new ApiClient(token);
      const configService = new ConfigService(args.projectRootDirectory);

      const [workspace, getError] = await to(client.workspaces.get({ workspace: args.workspaceDomain }));

      if (getError) {
        throw new UserError(`Provided workspace does not exist.`);
      }

      configService.updateConfig({
        workspace: workspace.domain,
        project: '',
        pipeline: 0,
        sandbox: ''
      });

      return 'Workspace set successfully. Now you can run "deploy" tool to deploy your application.';
    }
  });

  server.addTool({
    name: 'list-workspaces',
    description: 'List all available workspaces.',
    execute: async (_, { session }) => {
      const token = getSessionToken(session);
      const client = new ApiClient(token);

      const [data, listError] = await to(client.workspaces.list());

      if (listError) {
        throw new UserError(`Something went wrong while fetching workspaces: ${listError.message}`);
      }

      return `Workspaces:\n${JSON.stringify(data?.workspaces?.map(w => ({ domain: w.domain, name: w.name })), null, 2)}`;
    }
  });
};

export default { registerTools };