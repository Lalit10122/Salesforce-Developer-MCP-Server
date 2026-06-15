import fs from 'fs-extra';
import path from 'path';
import fg from 'fast-glob';
import { config } from '../config/index.js';

export function getMetadataPath(subFolder: string, ...paths: string[]): string {
  return path.join(config.projectPath, 'force-app', 'main', 'default', subFolder, ...paths);
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf8');
}

export async function readFile(filePath: string): Promise<string> {
  return await fs.readFile(filePath, 'utf8');
}

export async function deleteFile(filePath: string): Promise<void> {
  await fs.remove(filePath);
}

export async function exists(filePath: string): Promise<boolean> {
  return await fs.pathExists(filePath);
}

export async function findFiles(pattern: string): Promise<string[]> {
  const absolutePattern = path.isAbsolute(pattern)
    ? pattern
    : path.join(config.projectPath, pattern);
  
  // glob wants forward slashes, even on Windows
  const normalizedPattern = absolutePattern.replace(/\\/g, '/');
  return await fg(normalizedPattern);
}
