import { z } from 'zod';

const DeployParams = z.object({
  projectRootDirectory: z.string().describe('Absolute path to the project root directory where the source code is located'),
  appType: z.enum(['dynamic', 'static']).describe('Type of application: dynamic (requires sandbox) or static (hosted package)'),
  commitMessage: z.string().optional().describe('Custom commit message for the deployment commit'),
});

export {
  DeployParams
};
