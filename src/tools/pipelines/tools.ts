import { FastMCP, UserError } from 'fastmcp';
import { AddPipelineParams, AddPipelineStaticParams } from './types.js';
import { Config } from '../../lib/config.js';
import { ApiClient } from '../../lib/api/client.js';
import { MCPSession } from '../../types/server.js';
import getSessionToken from '../../lib/utils/getSessionToken.js';
import { to } from '../../lib/utils/to.js';
import { generatePipelineYaml, generateStaticPipelineYaml } from '../../lib/utils/pipelineYaml.js';

const registerTools = (server: FastMCP<MCPSession>) => {
  server.addTool({
    name: 'add-pipeline',
    description: 'Creates pipeline configuration for project with dynamic application.',
    parameters: AddPipelineParams,
    execute: async (args, { log, session }) => {
      const token = getSessionToken(session);
      const client = new ApiClient(token);
      const configService = new Config(args.projectRootDirectory);
      const config = configService.getConfig();

      if (!config.workspace) {
        throw new UserError('Workspace is not set. Please set it first by tool "set-workspace".');
      }

      if (!config.project) {
        throw new UserError('Project is not created. Please create it first by tool "add-project".');
      }

      if (args.appType === 'static') {
        throw new UserError('If you want to deploy static application, please use tool "add-pipeline-static".');
      }

      if (!config.sandbox) {
        throw new UserError('Sandbox is not created. Please create it first by tool "add-sandbox".');
      }

      if (config.pipeline) {
        throw new UserError('Pipeline is already created.');
      }

      const [sandbox, sandboxError] = await to(client.sandboxes.get(
        { workspace: config.workspace, sandbox_id: config.sandbox, project_name: config.project }
      ));

      if (sandboxError) {
        log.error(sandboxError.message);
        throw new UserError(`Failed to get sandbox: ${sandboxError.message}`);
      }

      const [pipeline, createPipelineError] = await to(client.pipelines.create(
        { workspace: config.workspace, project_name: config.project },
        { name: args.pipelineName }
      ));

      if (createPipelineError) {
        log.error(createPipelineError.message);
        throw new UserError(`Failed to create pipeline: ${createPipelineError.message}`);
      }

      config.pipeline = pipeline.id;
      config.appType = 'dynamic';
      configService.updateConfig(config);

      const base64Yaml = generatePipelineYaml(args, sandbox!.identifier);
      const [, updateError] = await to(client.pipelines.updateByYaml(
        { workspace: config.workspace, project_name: config.project, pipeline_id: pipeline.id },
        base64Yaml
      ));

      if (updateError) {
        log.error(updateError.message);
        throw new UserError(`Pipeline created but failed to update YAML configuration: ${updateError.message}`);
      }

      return 'Pipeline created successfully.';
    }
  });

  server.addTool({
    name: 'update-pipeline',
    description: 'Modifies existing pipeline configuration. Used for changing build or deployment settings.',
    parameters: AddPipelineParams,
    execute: async (args, { log, session }) => {
      const token = getSessionToken(session);
      const client = new ApiClient(token);
      const configService = new Config(args.projectRootDirectory);
      const config = configService.getConfig();

      if (!config.workspace) {
        throw new UserError('Workspace is not set. Please set it first by tool "set-workspace".');
      }

      if (!config.project) {
        throw new UserError('Project is not created. Please create it first by tool "add-project".');
      }

      if (args.appType === 'static') {
        throw new UserError('If you want to deploy static application, please use tool "add-pipeline-static".');
      }

      if (!config.sandbox) {
        throw new UserError('Sandbox is not created. Please create it first by tool "add-sandbox".');
      }

      if (!config.pipeline) {
        throw new UserError('Pipeline is not created. Please create it first by tool "add-pipeline".');
      }

      const [sandbox, sandboxError] = await to(client.sandboxes.get(
        { workspace: config.workspace, sandbox_id: config.sandbox, project_name: config.project }
      ));

      if (sandboxError) {
        log.error(sandboxError.message);
        throw new UserError(`Failed to get sandbox: ${sandboxError.message}`);
      }

      const base64Yaml = generatePipelineYaml(args, sandbox!.identifier);
      const [, updateError] = await to(client.pipelines.updateByYaml(
        { workspace: config.workspace, project_name: config.project, pipeline_id: config.pipeline },
        base64Yaml
      ));

      if (updateError) {
        log.error(updateError.message);
        throw new UserError(`Failed to update pipeline: ${updateError.message}`);
      }

      return 'Pipeline updated successfully.';
    }
  });

  server.addTool({
    name: 'add-pipeline-static',
    description: 'Creates pipeline configuration for project with static application.',
    parameters: AddPipelineStaticParams,
    execute: async (args, { log, session }) => {
      const token = getSessionToken(session);
      const client = new ApiClient(token);
      const configService = new Config(args.projectRootDirectory);
      const config = configService.getConfig();

      if (!config.workspace) {
        throw new UserError('Workspace is not set. Please set it first by tool "set-workspace".');
      }

      if (!config.project) {
        throw new UserError('Project is not created. Please create it first by tool "add-project".');
      }

      if (args.appType === 'dynamic') {
        throw new UserError('If you want to deploy dynamic application, please use tool "add-pipeline".');
      }

      if (config.pipeline) {
        throw new UserError('Pipeline is already created.');
      }

      const [pipeline, createPipelineError] = await to(client.pipelines.create(
        { workspace: config.workspace, project_name: config.project },
        { name: args.pipelineName }
      ));

      if (createPipelineError) {
        log.error(createPipelineError.message);
        throw new UserError(`Failed to create pipeline: ${createPipelineError.message}`);
      }

      config.pipeline = pipeline.id;
      config.appType = 'static';
      configService.updateConfig(config);

      const base64Yaml = generateStaticPipelineYaml(args);
      const [, updateError] = await to(client.pipelines.updateByYaml(
        { workspace: config.workspace, project_name: config.project, pipeline_id: pipeline.id },
        base64Yaml
      ));

      if (updateError) {
        log.error(updateError.message);
        throw new UserError(`Pipeline created but failed to update YAML configuration: ${updateError.message}`);
      }

      return 'Pipeline created successfully.';
    }
  });

  server.addTool({
    name: 'update-pipeline-static',
    description: 'Modifies existing pipeline configuration for static application.',
    parameters: AddPipelineStaticParams,
    execute: async (args, { log, session }) => {
      const token = getSessionToken(session);
      const client = new ApiClient(token);
      const configService = new Config(args.projectRootDirectory);
      const config = configService.getConfig();

      if (!config.workspace) {
        throw new UserError('Workspace is not set. Please set it first by tool "set-workspace".');
      }

      if (!config.project) {
        throw new UserError('Project is not created. Please create it first by tool "add-project".');
      }

      if (args.appType === 'dynamic') {
        throw new UserError('If you want to deploy dynamic application, please use tool "add-pipeline-dynamic".');
      }

      if (!config.pipeline) {
        throw new UserError('Pipeline is not created. Please create it first by tool "add-pipeline-static".');
      }

      const base64Yaml = generateStaticPipelineYaml(args);
      const [, updateError] = await to(client.pipelines.updateByYaml(
        { workspace: config.workspace, project_name: config.project, pipeline_id: config.pipeline },
        base64Yaml
      ));

      if (updateError) {
        log.error(updateError.message);
        throw new UserError(`Failed to update pipeline: ${updateError.message}`);
      }

      return 'Pipeline updated successfully.';
    }
  });
};

export default { registerTools };
