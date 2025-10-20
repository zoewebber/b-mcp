import { z } from 'zod';

const SetWorkspaceParams = z.object({
  rootDirectory: z.string().describe('Absolute path to the project root directory where the source code is located'),
  workspaceDomain: z.string().describe('Selected workspace domain to set as active workspace'),
});

export {
  SetWorkspaceParams
};