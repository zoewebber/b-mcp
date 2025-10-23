import { z } from 'zod';

const AddProjectParams = z.object({
  projectRootDirectory: z.string().describe('Absolute path to the project root directory where the source code is located'),
  projectName: z.string().describe('Unique name for the project that will be used to identify it in the system'),
});

export {
  AddProjectParams
};