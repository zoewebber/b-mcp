# Buddy Sandbox MCP Server

A Model Context Protocol (MCP) server that provides tools for managing application deployments on the Buddy platform.

## Prerequisites

- Node.js 22 or higher
- pnpm (`npm install -g pnpm`)
- Buddy account with API access

## Installation

```bash
pnpm install
```

## Running the Server

```bash
pnpm run build
pnpm start 
# or
BUDDY_API_URL=https://api.awsdev.net pnpm start # if you want to use other environment
# or
LOG_LEVEL=debug pnpm start # if you want to enable debug logging
```

The server will start on the configured port (default: 8080) using HTTP Streaming Transport.

## Connecting MCP Clients

This is an HTTP-based MCP server. To connect, use the HTTP transport with:

- **URL**: `http://localhost:8080/mcp`
- **Transport**: HTTP

### Example: Claude Code

With generated PAT:
```
claude mcp add-json buddy '{"type":"http","url":"http://localhost:8080/mcp","headers":{"Authorization":"Bearer <TOKEN>"}} --scope user'
```

With OAuth:
```
claude mcp add-json buddy '{"type":"http","url":"http://localhost:8080/mcp"}' --scope user
```


### Using OAuth flow for non-production environments

If you want to use OAuth flow and you test it on environment with self-signed certificate, you need to run Claude Code differently to ignore certificate errors:

```
NODE_TLS_REJECT_UNAUTHORIZED=0 claude 
```