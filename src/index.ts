import { FastMCP } from 'fastmcp';
import logger from './lib/logger.js';
import registerTools from './tools/index.js';
import { MCPSession } from './types/server.js';
import { ApiClient } from './lib/api/client';
import { to } from './lib/utils/to';

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
      issuer: 'https://api.local.io',
      authorizationEndpoint: 'https://api.local.io/oauth2/authorize',
      tokenEndpoint: 'https://api.local.io/oauth2/token',
      registrationEndpoint: 'https://api.local.io/auth/register',
      responseTypesSupported: ['code'],
      grantTypesSupported: ['authorization_code', 'refresh_token'],
      codeChallengeMethodsSupported: ['S256'],
      scopesSupported: ['USER_INFO', 'WORKSPACE']
    },
    protectedResource: {
      resource: 'http://localhost:8080',
      authorizationServers: ['http://localhost:8080'],
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

// Start with HTTP streaming transport
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

server.start({
  httpStream: {
    port: PORT,
  },
  transportType: 'httpStream',
});
