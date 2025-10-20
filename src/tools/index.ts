import { FastMCP } from 'fastmcp';
import workspacesTools from './workspaces/tools.js'
import projectsTools from './projects/tools.js'
import { MCPSession } from '../types/server.js';

const registerTools = (server: FastMCP<MCPSession>) => {
  workspacesTools.registerTools(server);
  projectsTools.registerTools(server);
}

export default registerTools;