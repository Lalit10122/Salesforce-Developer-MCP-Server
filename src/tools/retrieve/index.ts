import { McpServer } from '../../server.js';
import { z } from 'zod';
import { DeploymentService } from '../../services/DeploymentService.js';

export function registerRetrieveTools(server: McpServer): void {
  // retrieve_metadata
  server.tool(
    'retrieve_metadata',
    'Retrieve metadata from a Salesforce org',
    {
      metadata: z.array(z.string()).optional().describe('Specific metadata components to retrieve (e.g. ApexClass:MyClass)'),
      manifest: z.string().optional().describe('Path to a package.xml manifest file'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        if (!params.metadata && !params.manifest) {
          throw new Error('Either metadata components or manifest path must be specified.');
        }

        const result = await DeploymentService.retrieve({
          metadata: params.metadata,
          manifest: params.manifest,
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
              text: `Retrieve failed: ${error.message}`,
            },
          ],
        };
      }
    }
  );
}
