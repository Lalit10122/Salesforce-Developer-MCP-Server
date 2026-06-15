import { McpServer } from '../../server.js';
import { z } from 'zod';
import { SalesforceCLIService } from '../../services/SalesforceCLIService.js';

export function registerOrgTools(server: McpServer): void {
  // list_orgs
  server.tool(
    'list_orgs',
    'List all authenticated Salesforce orgs',
    {},
    async () => {
      try {
        const result = await SalesforceCLIService.executeJson<any>(['org', 'list']);
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
          content: [{ type: 'text', text: `Failed to list orgs: ${error.message}` }],
        };
      }
    }
  );

  // login_org
  server.tool(
    'login_org',
    'Open browser to log in to a Salesforce org and authorize CLI',
    {
      alias: z.string().optional().describe('Alias for the org'),
      instanceUrl: z.string().optional().describe('Login URL (defaults to production)'),
    },
    async (params) => {
      try {
        const args = ['org', 'login', 'web'];
        if (params.alias) {
          args.push('--alias', params.alias);
        }
        if (params.instanceUrl) {
          args.push('--instance-url', params.instanceUrl);
        }
        
        const result = await SalesforceCLIService.executeJson<any>(args);
        return {
          content: [
            {
              type: 'text',
              text: `Logged in successfully: ${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Login failed: ${error.message}` }],
        };
      }
    }
  );

  // set_default_org
  server.tool(
    'set_default_org',
    'Set default target org in configuration',
    {
      targetOrg: z.string().describe('Username or alias of the target org'),
      global: z.boolean().optional().describe('Whether to set it globally'),
    },
    async (params) => {
      try {
        const args = ['config', 'set', `target-org=${params.targetOrg}`];
        if (params.global) {
          args.push('--global');
        }
        const result = await SalesforceCLIService.executeJson<any>(args);
        return {
          content: [
            {
              type: 'text',
              text: `Set default org successfully: ${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to set default org: ${error.message}` }],
        };
      }
    }
  );

  // current_org
  server.tool(
    'current_org',
    'Display details of the default org or a specific org',
    {
      targetOrg: z.string().optional().describe('Username or alias of the org to display'),
    },
    async (params) => {
      try {
        const args = ['org', 'display'];
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
          content: [{ type: 'text', text: `Failed to get org details: ${error.message}` }],
        };
      }
    }
  );
}
