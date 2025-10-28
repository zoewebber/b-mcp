import { z } from 'zod';

const ApplicationType = z.enum(['static', 'dynamic']).describe('Type of application being deployed, either static (e.g., HTML/CSS/JS) or dynamic (e.g., Node.js, Python, PHP)');

const DeployParams = z.object({
  projectRootDirectory: z.string().describe('Absolute path to the project root directory where the source code is located'),
  appType: ApplicationType,
  commitMessage: z.string().optional().describe('Optional commit message describing the changes made in this deployment. If not provided, a default message will be used.'),
});

export {
  ApplicationType,
  DeployParams
};
