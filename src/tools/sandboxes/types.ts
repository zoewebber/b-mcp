import { z } from 'zod';
import { ApplicationType } from '../deploy/types';

const AddSandboxParams = z.object({
  projectRootDirectory: z.string().describe('Absolute path to the project root directory where the source code is located'),
  appType: ApplicationType,
  identifier: z.string().describe('Unique identifier for the sandbox'),
  name: z.string().describe('Descriptive name for the sandbox that indicates its purpose (e.g., "Production", "Staging", "Development")'),
  framework: z.string().describe('The framework or technology stack used to build the application (e.g., React, Angular, Vue, Express)'),
  setupCommands: z.string().describe(
    'Shell commands to prepare the base Ubuntu environment with system-level tools and runtimes. ' +
    'These commands run before application code is available, so focus on installing runtimes ' +
    '(Node.js, Python), system utilities (curl, git), and global tools. ' +
    'Separate multiple commands with \'&&\' or newlines. ' +
    'Example: \'curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs\''
  ),
  appRunCommand: z.string().optional().describe('Command to start the application. Optional for static applications that don\'t require a running process (e.g., "npm start", "node server.js"). Use commands which keep the process running in the foreground. It will be use in pipeline run to start the application after deployment.'),
  appPath: z.string().describe('Absolute path on the sandbox server where the application files will be deployed and served from. If nginx or apache is used, this should be the path to the web server\'s document root (e.g., "/var/www/html").'),
  port: z.number().describe('Network port the application will listen on. Must be an available port on the sandbox server that doesn\'t conflict with other services'),
}).describe('Parameters required to add a new sandbox environment for deploying and running the application, it includes configuration for setup environment for the application, it shouldn\'t install any code dependencies here, because that will be handled in the pipeline deployment step.');

export {
  AddSandboxParams
};
