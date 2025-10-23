import YAML from 'yaml';

interface PipelineYamlConfig {
  pipeline: string;
  refs: string[];
  resources?: string;
  actions: unknown[];
}

interface BuildAction {
  image: string;
  imageVersion: string;
  buildCommands?: string[];
}

interface DeploymentAction {
  remotePath: string;
  ignores?: string[];
  commands?: string[];
}

interface PipelineParams {
  pipelineName: string;
  buildAction: BuildAction;
  deploymentAction: DeploymentAction;
}

interface StaticDeploymentAction {
  ignores?: string[];
}

interface StaticPipelineParams {
  pipelineName: string;
  buildAction: BuildAction;
  deploymentAction: StaticDeploymentAction;
}

/**
 * Generates a base64-encoded YAML configuration for a dynamic application pipeline
 * @param params Pipeline configuration parameters
 * @param sandboxIdentifier Identifier of the target sandbox
 * @returns Base64-encoded YAML string
 */
export function generatePipelineYaml(params: PipelineParams, sandboxIdentifier: string): string {
  const yamlObject: PipelineYamlConfig[] = [{
    pipeline: params.pipelineName,
    refs: ['*'],
    resources: 'XLARGE',
    actions: [params.buildAction.buildCommands?.length && {
      action: 'Build application',
      type: 'BUILD',
      docker_image_name: params.buildAction.image,
      docker_image_tag: params.buildAction.imageVersion,
      shell: 'BASH',
      execute_commands: params.buildAction.buildCommands
    }, {
      action: 'Deploy to sandbox',
      type: 'TRANSFER',
      input_type: 'BUILD_ARTIFACTS',
      remote_path: params.deploymentAction.remotePath,
      targets: [sandboxIdentifier],
      deployment_excludes: params.deploymentAction.ignores
    }, params.deploymentAction.commands?.length && {
      action: 'Run commands after deployment',
      type: 'SSH_COMMAND',
      commands: params.deploymentAction.commands,
      working_directory: params.deploymentAction.remotePath,
      targets: [sandboxIdentifier],
      shell: 'BASH',
    }, {
      action: 'Restart application',
      type: 'SANDBOX_MANAGE',
      operation: 'APP_START',
      targets: [sandboxIdentifier],
    }].filter(Boolean)
  }];

  const yamlString = YAML.stringify(yamlObject);
  return Buffer.from(yamlString).toString('base64');
}

/**
 * Generates a base64-encoded YAML configuration for a static application pipeline
 * @param params Pipeline configuration parameters
 * @returns Base64-encoded YAML string
 */
export function generateStaticPipelineYaml(params: StaticPipelineParams): string {
  const yamlObject: PipelineYamlConfig[] = [{
    pipeline: params.pipelineName,
    refs: ['*'],
    // resources: 'XLARGE',
    actions: [params.buildAction.buildCommands?.length && {
      action: 'Build application',
      type: 'BUILD',
      docker_image_name: params.buildAction.image,
      docker_image_tag: params.buildAction.imageVersion,
      shell: 'BASH',
      execute_commands: params.buildAction.buildCommands
    }, {
      action: 'Deploy',
      type: 'PUBLISH_PACKAGE_VERSION',
      input_type: 'BUILD_ARTIFACTS',
      package: 'site',
      versions: ['latest'],
      deployment_excludes: params.deploymentAction.ignores,
    }].filter(Boolean)
  }];

  const yamlString = YAML.stringify(yamlObject);
  return Buffer.from(yamlString).toString('base64');
}
