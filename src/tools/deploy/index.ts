import { McpServer } from '../../server.js';
import { z } from 'zod';
import { DeploymentService } from '../../services/DeploymentService.js';

export function registerDeployTools(server: McpServer): void {
  // deploy_metadata
  server.tool(
    'deploy_metadata',
    'Deploy project source metadata to a Salesforce org',
    {
      metadata: z.array(z.string()).optional().describe('Specific metadata components to deploy (e.g. ApexClass:MyClass, CustomObject:Invoice__c)'),
      sourceDirs: z.array(z.string()).optional().describe('Specific source directories to deploy'),
      checkOnly: z.boolean().optional().default(false).describe('Whether to validate the deployment without saving changes (check-only/dry-run)'),
      testLevel: z.enum(['NoTestRun', 'RunSpecifiedTests', 'RunLocalTests', 'RunAllTestsInOrg']).optional().describe('Apex test execution level'),
      tests: z.array(z.string()).optional().describe('Specific Apex tests to run if testLevel is RunSpecifiedTests'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const result = await DeploymentService.deploy({
          metadata: params.metadata,
          sourceDirs: params.sourceDirs,
          checkOnly: params.checkOnly,
          testLevel: params.testLevel,
          tests: params.tests,
          targetOrg: params.targetOrg,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Deployment failed: ${error.message}\n` +
                    `Details: ${JSON.stringify(error.details || {}, null, 2)}`,
            },
          ],
        };
      }
    }
  );
}
