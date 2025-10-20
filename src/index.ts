import { FastMCP } from 'fastmcp';
import logger from './lib/logger.js';
import registerTools from './tools/index.js';
import { MCPSession } from './types/server.js';

const server = new FastMCP<MCPSession>({
  name: 'Buddy Sandbox MCP',
  version: '1.0.0',
  authenticate: async (request) => {
    const token = (request.headers['token'] || '') as string;

    return {
      token,
    };
  },
  logger
});

registerTools(server);

// Start with HTTP streaming transport
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

server.start({
  httpStream: {
    port: PORT
  },
  transportType: 'httpStream',
});
