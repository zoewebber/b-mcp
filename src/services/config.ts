import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ProjectConfig {
  workspace: string;
  appType?: 'static' | 'dynamic';
  project: string;
  pipeline: number;
  sandbox: string;
}

export class ConfigService {
  private readonly configPath: string;

  constructor(mainDirectoryPath: string) {
    this.configPath = path.join(mainDirectoryPath, '.buddy', 'project.state.json');
  }

  getConfig(): ProjectConfig {
    try {
      if (!fs.existsSync(this.configPath)) {
        return {
          workspace: '',
          project: '',
          pipeline: 0,
          sandbox: ''
        };
      }

      const configContent = fs.readFileSync(this.configPath, 'utf-8');
      return JSON.parse(configContent) as ProjectConfig;
    } catch (error) {
      return {
        workspace: '',
        project: '',
        pipeline: 0,
        sandbox: ''
      };
    }
  }

  updateConfig(config: ProjectConfig): boolean {
    try {
      const dirPath = path.dirname(this.configPath);

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      return true;
    } catch (error) {
      return false;
    }
  }
}