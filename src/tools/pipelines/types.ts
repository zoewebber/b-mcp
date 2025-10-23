import { z } from 'zod';

const BuildActionParams = z.object({
  image: z.string().describe('Docker image name for the build environment'),
  imageVersion: z.string().describe('Docker image version tag'),
  buildCommands: z.array(z.string()).optional().describe('Commands to build the application'),
});

const DeploymentActionParams = z.object({
  remotePath: z.string().describe('Remote path where files will be deployed'),
  ignores: z.array(z.string()).optional().describe('Patterns for files to exclude from deployment'),
  commands: z.array(z.string()).optional().describe('Commands to run after deployment'),
});

const AddPipelineParams = z.object({
  projectRootDirectory: z.string().describe('Absolute path to the project root directory where the source code is located'),
  pipelineName: z.string().describe('Name for the pipeline'),
  buildAction: BuildActionParams,
  deploymentAction: DeploymentActionParams,
});

const AddPipelineStaticParams = z.object({
  projectRootDirectory: z.string().describe('Absolute path to the project root directory where the source code is located'),
  pipelineName: z.string().describe('Name for the pipeline'),
  buildAction: BuildActionParams,
  deploymentAction: z.object({
    ignores: z.array(z.string()).optional().describe('Patterns for files to exclude from deployment'),
  }),
});

export {
  AddPipelineParams,
  AddPipelineStaticParams
};
