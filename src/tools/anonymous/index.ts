import { McpServer } from '../../server.js';
import { z } from 'zod';
import { SalesforceCLIService } from '../../services/SalesforceCLIService.js';

export function registerAnonymousApexTools(server: McpServer): void {
  // execute_anonymous
  server.tool(
    'execute_anonymous',
    'Execute a block of anonymous Apex code in the org',
    {
      code: z.string().describe('Apex code to execute'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const args = ['apex', 'run', '--body', params.code, '--json'];
        if (params.targetOrg) {
          args.push('--target-org', params.targetOrg);
        }

        const result = await SalesforceCLIService.executeJson<any>(args);
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
              text: `Execution failed: ${error.message}\n` +
                    `Details: ${error.stderr || ''}`,
            },
          ],
        };
      }
    }
  );
}
