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
pnpm start or BUDDY_API_URL=https://api.awsdev.net pnpm start # if you want to use other environment
```

The server will start on the configured port (default: 8080) using HTTP Streaming Transport.

## Connecting MCP Clients

This is an HTTP-based MCP server. To connect, use the HTTP transport with:

- **URL**: `http://localhost:8080/mcp`
- **Transport**: HTTP

### Example: Claude Desktop Configuration

Edit your Claude Desktop config file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "buddy-sandbox": {
      "url": "http://localhost:8080/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_BUDDY_API_KEY"
      }
    }
  }
}
```
