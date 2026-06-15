import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export interface Config {
  sfDefaultOrg?: string;
  projectPath: string;
  logLevel: string;
  port: number;
}

const rawProjectPath = process.env.PROJECT_PATH || '.';
const absoluteProjectPath = path.isAbsolute(rawProjectPath)
  ? rawProjectPath
  : path.resolve(process.cwd(), rawProjectPath);

export const config: Config = {
  sfDefaultOrg: process.env.SF_DEFAULT_ORG,
  projectPath: absoluteProjectPath,
  logLevel: process.env.LOG_LEVEL || 'info',
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
};
