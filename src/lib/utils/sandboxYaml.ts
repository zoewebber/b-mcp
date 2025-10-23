import YAML from 'yaml';

interface SandboxYamlConfig {
  sandbox: string;
  name: string;
  os: string;
  resources: string;
  install_commands: string;
  app_type: string;
  run_command: string;
  app_dir: string;
  endpoints: { name: string; endpoint: number; }[];
}

interface SandboxParams {
  identifier: string;
  name: string;
  installCommands: string[];
  appRunCommand: string;
  appPath: string;
  port: number;
}

/**
 * Generates a base64-encoded YAML configuration for a sandbox
 * @param params Sandbox configuration parameters
 * @returns Base64-encoded YAML string
 */
export function generateSandboxYaml(params: SandboxParams): string {
  const yamlObject: SandboxYamlConfig[] = [{
    sandbox: params.identifier,
    name: params.name,
    os: 'ubuntu:24.04',
    resources: '6x12',
    install_commands: params.installCommands.join('\n'),
    app_type: 'CMD',
    run_command: params.appRunCommand,
    app_dir: params.appPath,
    endpoints: [{
      name: 'www',
      endpoint: params.port,
    }]
  }];

  return Buffer.from(YAML.stringify(yamlObject)).toString('base64');
}
