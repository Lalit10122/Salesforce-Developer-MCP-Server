import { SalesforceCLIService } from './SalesforceCLIService.js';
import { DeploymentError } from '../utils/errors.js';
import { LoggerService } from './LoggerService.js';

export interface DeployResult {
  status: string;
  success: boolean;
  id?: string;
  error?: string;
  details?: {
    componentFailures?: Array<{
      fullName: string;
      componentType: string;
      fileName: string;
      problem: string;
      problemType: string;
      lineNumber?: string;
      columnNumber?: string;
    }>;
    componentSuccesses?: Array<{
      fullName: string;
      componentType: string;
      fileName: string;
      state: string;
    }>;
  };
}

export interface RetrieveResult {
  status: string;
  success: boolean;
  messages?: Array<{
    fileName: string;
    problem: string;
  }>;
  fileProperties?: Array<{
    fullName: string;
    type: string;
    fileName: string;
  }>;
}

export class DeploymentService {
  /**
   * Deploys metadata using Salesforce CLI (sf project deploy start).
   */
  public static async deploy(options: {
    metadata?: string[];
    sourceDirs?: string[];
    targetOrg?: string;
    checkOnly?: boolean;
    testLevel?: 'NoTestRun' | 'RunSpecifiedTests' | 'RunLocalTests' | 'RunAllTestsInOrg';
    tests?: string[];
  }): Promise<DeployResult> {
    const args = ['project', 'deploy', 'start', '--json'];

    if (options.targetOrg) {
      args.push('--target-org', options.targetOrg);
    }
    if (options.checkOnly) {
      args.push('--dry-run');
    }
    if (options.metadata && options.metadata.length > 0) {
      args.push('--metadata', options.metadata.join(','));
    } else if (options.sourceDirs && options.sourceDirs.length > 0) {
      args.push('--source-dir', options.sourceDirs.join(','));
    }
    if (options.testLevel) {
      args.push('--test-level', options.testLevel);
    }
    if (options.tests && options.tests.length > 0) {
      args.push('--tests', options.tests.join(','));
    }

    LoggerService.info({ options }, 'Starting Salesforce metadata deployment');

    try {
      const result = await SalesforceCLIService.executeJson<any>(args);
      
      // sf project deploy start JSON output returns status: "Succeeded" or "Failed"
      const status = result.status;
      const success = result.success || status === 'Succeeded';
      
      LoggerService.info({ success, status, deployId: result.id }, 'Deployment command completed');

      return {
        status,
        success,
        id: result.id,
        details: result.details || {},
      };
    } catch (error: any) {
      // CLIError or other error
      LoggerService.error({ error }, 'Deployment failed');
      let details: any = {};
      try {
        if (error.stderr) {
          const parsed = JSON.parse(error.stderr);
          details = parsed.result?.details || parsed.details || parsed.result || {};
        }
      } catch (pe) {
        // failed to parse JSON error details, fallback
      }

      throw new DeploymentError(
        error.message || 'Deployment failed',
        details
      );
    }
  }

  /**
   * Retrieves metadata using Salesforce CLI (sf project retrieve start).
   */
  public static async retrieve(options: {
    metadata?: string[];
    manifest?: string;
    targetOrg?: string;
  }): Promise<RetrieveResult> {
    const args = ['project', 'retrieve', 'start', '--json'];

    if (options.targetOrg) {
      args.push('--target-org', options.targetOrg);
    }
    if (options.metadata && options.metadata.length > 0) {
      args.push('--metadata', options.metadata.join(','));
    } else if (options.manifest) {
      args.push('--manifest', options.manifest);
    }

    LoggerService.info({ options }, 'Starting Salesforce metadata retrieve');

    try {
      const result = await SalesforceCLIService.executeJson<any>(args);
      return {
        status: result.status,
        success: result.success || result.status === 'Succeeded',
        messages: result.messages || [],
        fileProperties: result.fileProperties || [],
      };
    } catch (error: any) {
      LoggerService.error({ error }, 'Retrieve failed');
      throw new DeploymentError(error.message || 'Retrieve failed', error.stderr);
    }
  }
}
