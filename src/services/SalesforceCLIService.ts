import { execa } from 'execa';
import { CLIError } from '../utils/errors.js';
import { LoggerService } from './LoggerService.js';
import { config } from '../config/index.js';

export class SalesforceCLIService {
  /**
   * Executes a Salesforce CLI command.
   */
  public static async execute(args: string[], options: { cwd?: string; env?: Record<string, string> } = {}): Promise<{ stdout: string; stderr: string }> {
    const cwd = options.cwd || config.projectPath;
    const env = { ...process.env, ...options.env };

    LoggerService.debug({ args, cwd }, 'Running Salesforce CLI command');

    try {
      const result = await execa('sf', args, { cwd, env });
      return { stdout: result.stdout, stderr: result.stderr };
    } catch (error: any) {
      LoggerService.error({ error, args }, 'Salesforce CLI command failed');
      const message = error.message || 'Salesforce CLI command execution failed';
      const stderr = error.stderr || '';
      throw new CLIError(message, stderr);
    }
  }

  /**
   * Executes a Salesforce CLI command and returns parsed JSON output.
   * Automatically adds --json if not present.
   */
  public static async executeJson<T>(args: string[], options: { cwd?: string; env?: Record<string, string> } = {}): Promise<T> {
    const formattedArgs = [...args];
    if (!formattedArgs.includes('--json')) {
      formattedArgs.push('--json');
    }

    const { stdout } = await this.execute(formattedArgs, options);
    
    try {
      const parsed = JSON.parse(stdout);
      
      // In standard Salesforce CLI output, errors are wrapped in standard structures
      if (parsed.status !== 0 && parsed.status !== undefined) {
        const errMsg = parsed.message || parsed.result?.message || 'Salesforce CLI command returned error status';
        throw new CLIError(errMsg, JSON.stringify(parsed));
      }
      
      // Returns either the full body or result sub-field.
      return (parsed.result !== undefined ? parsed.result : parsed) as T;
    } catch (e: any) {
      if (e instanceof CLIError) {
        throw e;
      }
      throw new CLIError(`Failed to parse CLI JSON output: ${e.message}`, stdout);
    }
  }
}
