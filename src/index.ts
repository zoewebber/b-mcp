import { FastMCP } from 'fastmcp';
import logger from './lib/logger.js';
import registerTools from './tools/index.js';
import { MCPSession } from './types/server.js';
import { ApiClient } from './lib/api/client';
import { to } from './lib/utils/to';
import * as process from 'node:process';

process.env.BUDDY_API_URL = process.env.BUDDY_API_URL || 'https://api.buddy.works';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const MCP_URL = process.env.MCP_URL || `http://localhost:${PORT}`;
const BUDDY_API_URL = process.env.BUDDY_API_URL;

const server = new FastMCP<MCPSession>({
  name: 'Buddy Sandbox MCP',
  version: '1.0.0',
  instructions: `
# Buddy Deployment Assistant

## Overview
I am a deployment assistant for the Buddy platform. I help users deploy their applications through a strictly ordered process. You must complete each step in this exact sequence:

1. FIRST: Create or identify a project that will host the git repository
2. SECOND: Set up a sandbox environment where the application will run
3. THIRD: Configure a deployment pipeline that automates the build and deployment

Do not attempt to set up a sandbox until a project is created or identified. Do not attempt to configure a pipeline until a sandbox is set up. Following this strict order is essential for successful deployment.
`,
  oauth: {
    enabled: true,
    authorizationServer: {
      issuer: BUDDY_API_URL,
      authorizationEndpoint: `${BUDDY_API_URL}/oauth2/authorize`,
      tokenEndpoint: `${BUDDY_API_URL}/oauth2/token`,
      registrationEndpoint: `${BUDDY_API_URL}/auth/register`,
      responseTypesSupported: ['code'],
      grantTypesSupported: ['authorization_code', 'refresh_token'],
      codeChallengeMethodsSupported: ['S256'],
      scopesSupported: ['USER_INFO', 'USER_KEY', 'WORKSPACE', 'EXECUTION_MANAGE', 'REPOSITORY_WRITE', 'SANDBOX_MANAGE', 'PACKAGE_MANAGE' ],
    },
    protectedResource: {
      resource: MCP_URL,
      authorizationServers: [MCP_URL],
    },
  },
  authenticate: async (request) => {
    const token = (request.headers['authorization'] || '').replaceAll('Bearer ', '') as string;

    if (!token) {
      throw new Error('Unauthorized');
    }

    const client = new ApiClient(token);
    const [user, error] = await to(client.user.getUser());
    if (error || !user) {
      throw new Error('Unauthorized');
    }

    return {
      user,
      token,
    };
  },
  logger,
});

registerTools(server);

server.start({
  httpStream: {
    port: PORT,
  },
  transportType: 'httpStream',
});
console.log(`MCP server available at: ${MCP_URL}`);
