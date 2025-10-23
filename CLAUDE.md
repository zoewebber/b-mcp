# CLAUDE.md - Buddy Sandbox MCP Server

This document provides essential information for AI assistants (like Claude) working on this codebase.

## Project Overview

**Buddy Sandbox MCP** is a Model Context Protocol (MCP) server that provides tools for managing application deployments on the Buddy platform. It enables AI assistants to create workspaces, projects, sandboxes, pipelines, and deploy applications through a set of MCP tools.

- **Type**: MCP Server (FastMCP-based)
- **Language**: TypeScript
- **Runtime**: Node.js 22+
- **Protocol**: HTTP Streaming Transport
- **Default Port**: 8080

## Architecture

### Directory Structure

```
src/
├── index.ts                    # Entry point, server initialization
├── types/
│   ├── server.ts              # MCPSession type definitions
│   └── api/                   # API response type definitions
│       ├── workspaces.ts
│       ├── projects.ts
│       ├── sandboxes.ts
│       ├── pipelines.ts
│       └── user.ts
├── lib/
│   ├── api/
│   │   ├── client.ts          # Main API client with resource accessors
│   │   ├── resources/         # API resource classes
│   │   │   ├── workspaces.ts
│   │   │   ├── projects.ts
│   │   │   ├── sandboxes.ts
│   │   │   ├── pipelines.ts
│   │   │   ├── source.ts
│   │   │   └── user.ts
│   │   └── utils/
│   │       ├── preparePath.ts # Path parameter interpolation
│   │       └── validatePathParams.ts
│   ├── config.ts              # Local configuration management
│   ├── git.ts                 # Git operations wrapper
│   ├── logger.ts              # Winston logger configuration
│   └── utils/
│       ├── getSessionToken.ts
│       ├── pipelineYaml.ts    # Pipeline YAML generation
│       ├── sandboxYaml.ts     # Sandbox YAML generation
│       ├── sleep.ts
│       └── to.ts              # Error handling utility
└── tools/                     # MCP tool implementations
    ├── index.ts               # Tool registration
    ├── workspaces/
    │   ├── tools.ts           # set-workspace, list-workspaces
    │   └── types.ts
    ├── projects/
    │   ├── tools.ts           # add-project
    │   └── types.ts
    ├── sandboxes/
    │   ├── tools.ts           # add-sandbox, update-sandbox
    │   └── types.ts
    ├── pipelines/
    │   ├── tools.ts           # add-pipeline, update-pipeline, add-pipeline-static, update-pipeline-static
    │   └── types.ts
    └── deploy/
        ├── tools.ts           # deploy
        └── types.ts
```

### Core Components

#### 1. API Client (`src/lib/api/client.ts`)

The main HTTP client for interacting with the Buddy API:

- **Base URL**: Set via `BUDDY_API_URL` environment variable
- **Authentication**: Bearer token from session
- **Query Parameters**: Supported via `queryParams` option (uses native `URL` class)
- **Resources**: Organized into separate classes (workspaces, projects, sandboxes, pipelines, source, user)

**Important Notes**:
- TLS certificate validation is disabled (`NODE_TLS_REJECT_UNAUTHORIZED = '0'`)
- All requests include debug logging
- Errors are wrapped in `ApiError` class with status codes

#### 2. API Resources

Each resource class handles a specific domain:

- **WorkspacesApi**: Workspace management
- **ProjectsApi**: Project/repository management
- **SourceApi**: Source control and commit tracking
- **SandboxesApi**: Sandbox environment management (see special notes below)
- **PipelinesApi**: Pipeline configuration and execution
- **UserApi**: User and SSH key management

#### 3. MCP Tools

Tools are organized by functionality and follow a consistent pattern:

```typescript
server.addTool({
  name: 'tool-name',
  description: 'Tool description',
  parameters: ToolParams,  // Zod schema
  execute: async (args, { log, session }) => {
    // Implementation
  }
});
```

**Tool Workflow**:
1. `set-workspace` → Select workspace
2. `add-project` → Create project
3. **For dynamic apps**: `add-sandbox` → `add-pipeline` → `deploy`
4. **For static apps**: `add-pipeline-static` → `deploy`

#### 4. Configuration Management

The `Config` class (`src/lib/config.ts`) manages local state:

- **Location**: `.buddy/config.json` in project directory
- **Stored Data**:
  - `workspace`: Current workspace domain
  - `project`: Project name
  - `pipeline`: Pipeline ID
  - `sandbox`: Sandbox ID (for dynamic apps)
  - `appType`: 'static' | 'dynamic'

## Critical API Information

### Sandboxes API Endpoints

**IMPORTANT**: Sandboxes API has a unique structure compared to other resources:

- **Endpoint Pattern**: `/workspaces/:workspace/sandboxes/:sandboxId`
- **NOT**: `/workspaces/:workspace/projects/:project/sandboxes/:sandboxId`
- **Query Parameter**: All sandbox endpoints require `project_name` as a query parameter

**Example**:
```typescript
client.sandboxes.get(
  { workspace: 'my-workspace', sandboxId: 'sandbox-123' },
  { project_name: 'my-project' }  // ⚠️ Note: project_name, not projectName
)
// Results in: GET /workspaces/my-workspace/sandboxes/sandbox-123?project_name=my-project
```

**Methods**:
- `createByYaml(pathParams, queryParams, yaml)` - Create sandbox
- `get(pathParams, queryParams)` - Get sandbox details
- `waitForReady(pathParams, queryParams, options)` - Poll until setup complete
- `updateByYaml(pathParams, queryParams, yaml)` - Update sandbox configuration
- `getAppLogs(pathParams, queryParams)` - Get application logs
- `generatePreviewUrls(sandbox)` - Generate preview URLs from sandbox endpoints

**Sandbox Status Flow**:
- `setup_status: 'INPROGRESS'` → Sandbox is being configured
- `setup_status: 'FAILED'` → Setup failed (check `boot_logs`)
- `setup_status: 'SUCCEEDED'` → Sandbox ready
- `app_status: 'FAILED'` → Application failed to start (check app logs)

### Other API Patterns

Most other resources follow the standard pattern:
- Path parameters for resource hierarchy
- Query parameters are rare (except sandboxes)
- Example: `/workspaces/:workspace/projects/:project/pipelines/:pipelineId`

## Development Workflows

### Common Patterns

#### 1. Error Handling

Use the `to()` utility for async operations:

```typescript
import { to } from '../lib/utils/to';

const [result, error] = await to(someAsyncOperation());
if (error) {
  log.error(error.message);
  throw new UserError(`Failed: ${error.message}`);
}
```

#### 2. Configuration Checks

Always validate configuration state before operations:

```typescript
if (!config.workspace) {
  throw new UserError('Workspace is not set. Please set it first by tool "set-workspace".');
}
```

#### 3. Polling Operations

Use `waitForReady` or similar polling methods with timeout:

```typescript
const [readySandbox, waitError] = await to(client.sandboxes.waitForReady(
  { workspace: config.workspace, sandboxId: sandbox.id },
  { project_name: config.project },
  { pollInterval: 5000, timeout: 600000 }  // 5s interval, 10min timeout
));
```

## Important Conventions

### Naming

- **Query Parameters**: Use snake_case (e.g., `project_name`, not `projectName`)
- **Path Parameters**: Use camelCase in TypeScript (e.g., `sandboxId`)
- **Environment Variables**: SCREAMING_SNAKE_CASE (e.g., `BUDDY_API_URL`)

### YAML Generation

- Sandbox and pipeline configurations are generated as base64-encoded YAML
- Use utility functions: `generateSandboxYaml()`, `generatePipelineYaml()`
- YAML is base64-encoded before sending to API

### Git Operations

The `Git` class wraps `simple-git`:
- Uses token-based authentication
- Handles remote configuration
- Commits with meaningful messages
- Waits for commits to sync with Buddy repository

## Testing & Debugging

### Building

```bash
npm run build    # Compile TypeScript
npm run watch    # Watch mode
npm run clean    # Clean dist/
```

### Environment Variables

Required:
- `BUDDY_API_URL` - Buddy API base URL
- `PORT` - Server port (default: 8080)

### Logging

Winston logger with different levels:
- `logger.info()` - General information
- `logger.debug()` - Debug details (API requests/responses)
- `logger.error()` - Errors

## Common Issues & Solutions

### 1. Sandbox Creation Fails

- Check `boot_logs` in the response
- Verify YAML configuration (ports, environment variables)
- Ensure framework detection is correct

### 2. Pipeline Execution Fails

- Check action logs via `getFailedActionExecution()`
- Verify sandbox is in correct state
- Check branch and commit exist in repository

### 3. Query Parameter Errors

- Always use `project_name` (not `projectName`) for sandbox operations
- Ensure query parameters are passed as second argument
- Verify URL construction uses native `URL` class

## Recent Changes

### 2025-01-23: Sandboxes API Refactoring

- **Changed**: Sandbox endpoints moved from project-scoped to workspace-scoped
- **Added**: `project_name` query parameter to all sandbox operations
- **Updated**: URL construction to use native `URL` class instead of string concatenation
- **Changed**: Sandbox status from `CONFIGURING` to `INPROGRESS`

### Key Commits

- Refactored sandboxes API to use workspace-scoped endpoints
- Added query parameter support to API client
- Updated all tool implementations to use new API structure
- Fixed query parameter naming (projectName → project_name)

## Tips for AI Assistants

1. **Always check configuration state** before operations
2. **Use the `to()` utility** for error handling
3. **Follow the tool workflow** (workspace → project → sandbox/pipeline → deploy)
4. **Remember sandbox API is special** - uses query parameters for project
5. **Check status codes** and handle specific errors (e.g., 404 for not found)
6. **Use logging extensively** for debugging
7. **Validate YAML** before sending to API
8. **Wait for async operations** (commit sync, sandbox setup, pipeline execution)
9. **Clean up on errors** where appropriate
10. **Provide helpful error messages** to users with actionable guidance

## Links & Resources

- **FastMCP**: https://github.com/anthropics/mcp
- **Buddy API**: Documentation referenced in code (check BUDDY_API_URL)
- **MCP Protocol**: https://modelcontextprotocol.io/

---

*This document is for AI assistant use and should be kept up-to-date with significant architectural changes.*