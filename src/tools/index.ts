import { FastMCP } from 'fastmcp';
import workspacesTools from './workspaces/tools.js'
import projectsTools from './projects/tools.js'
import sandboxesTools from './sandboxes/tools.js'
import pipelinesTools from './pipelines/tools.js'
import deployTools from './deploy/tools.js'
import { MCPSession } from '../types/server.js';

const registerTools = (server: FastMCP<MCPSession>) => {
  workspacesTools.registerTools(server);
  projectsTools.registerTools(server);
  sandboxesTools.registerTools(server);
  pipelinesTools.registerTools(server);
  deployTools.registerTools(server);
}

export default registerTools;