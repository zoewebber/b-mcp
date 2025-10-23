import { z } from 'zod';

const AddSandboxParams = z.object({
  projectRootDirectory: z.string().describe('Absolute path to the project root directory where the source code is located'),
  identifier: z.string().describe('Unique identifier for the sandbox'),
  name: z.string().describe('Display name for the sandbox'),
  installCommands: z.array(z.string()).describe('Commands to install dependencies and prepare the environment'),
  appRunCommand: z.string().describe('Command to start the application'),
  appPath: z.string().describe('Path to the application directory'),
  port: z.number().describe('Port number where the application will run'),
});

export {
  AddSandboxParams
};
