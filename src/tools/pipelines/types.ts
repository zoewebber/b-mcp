import { z } from 'zod';
import { ApplicationType } from '../deploy/types';

const BuildActionParams = z.object({
  image: z.string().describe('Docker image name to use as the environment for the build pipeline'),
  imageVersion: z.string().describe('Specific version tag of the Docker image to ensure consistent build environments'),
  buildCommands: z.array(z.string()).describe('Ordered list of shell commands that will run sequentially to build the application'),
}).describe('Configuration settings for building the application, which should be derived from the project\'s structure, package.json, and build configuration files');

const DeploymentActionParams = z.object({
  path: z.string().describe('Relative path from the project root to the directory that should be deployed, such as the build output directory (e.g., "dist/", "build/", "public/")'),
  ignores: z.array(z.string()).describe('Glob patterns of files or directories to exclude from deployment (e.g., "node_modules/", "*.log", ".git/"). Directory patterns should end with a slash.'),
  commands: z.array(z.string()).describe('Post-deployment commands to execute, such as installing application dependencies (e.g., "npm install", "yarn install") or running database migrations (e.g., "npm run migrate", "yarn migrate"). Note: Do not include application startup commands as the sandbox environment handles this automatically.'),
  remotePath: z.string().describe('Absolute path on the target server where the application will be deployed. This must match the sandbox\'s application path configuration.'),
}).describe('Configuration settings that define how the built application artifacts will be deployed to the target sandbox environment');

const AddPipelineParams = z.object({
  projectRootDirectory: z.string().describe('Absolute path to the project root directory where the source code is located'),
  appType: ApplicationType,
  pipelineName: z.string().describe('Descriptive name for the pipeline that clearly indicates its purpose and functionality'),
  framework: z.string().describe('The framework or technology stack used to build the application (e.g., React, Angular, Vue, Express)'),
  buildAction: BuildActionParams,
  deploymentAction: DeploymentActionParams,
});

const AddPipelineStaticParams = z.object({
  projectRootDirectory: z.string().describe('Absolute path to the project root directory where the source code is located'),
  appType: ApplicationType,
  pipelineName: z.string().describe('Descriptive name for the pipeline that clearly indicates its purpose and functionality'),
  framework: z.string().describe('The framework or technology stack used to build the application (e.g., React, Angular, Vue, Express)'),
  buildAction: BuildActionParams,
  deploymentAction: z.object({
    path: z.string().describe('Relative path from the project root to the directory that should be deployed, such as the build output directory (e.g., "dist/", "build/", "public/")'),
    ignores: z.array(z.string()).describe('Glob patterns of files or directories to exclude from deployment (e.g., "node_modules/", "*.log", ".git/"). Directory patterns should end with a slash.'),
  }).describe('Configuration settings that define which files or directories will be published'),
});

export {
  AddPipelineParams,
  AddPipelineStaticParams
};
