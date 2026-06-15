import { McpServer } from '../../server.js';
import { z } from 'zod';
import { MetadataService } from '../../services/MetadataService.js';
import { DeploymentService } from '../../services/DeploymentService.js';
import { getMetadataPath, writeFile } from '../../utils/file.js';
import { buildMetadataXml } from '../../utils/xml.js';
import { sfDevNameSchema } from '../../utils/validation.js';

export function registerVisualforceTools(server: McpServer): void {
  // create_page
  server.tool(
    'create_vf_page',
    'Create a new Visualforce Page',
    {
      pageName: sfDevNameSchema.describe('Name of the Visualforce Page'),
      content: z.string().describe('Body content of the Visualforce Page (starting with <apex:page>)'),
      label: z.string().optional().describe('Label of the page'),
      apiVersion: z.string().optional().describe('API Version (default 60.0)'),
      autoDeploy: z.boolean().optional().default(true).describe('Automatically deploy to default org'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const result = await MetadataService.createVisualforcePage(params.pageName, params.content, {
          apiVersion: params.apiVersion,
          label: params.label,
          autoDeploy: params.autoDeploy,
          targetOrg: params.targetOrg,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Visualforce Page '${params.pageName}' created locally.\n` +
                    `File paths:\n${result.filePaths.join('\n')}\n\n` +
                    `Deployment status: ${result.deployResult ? JSON.stringify(result.deployResult, null, 2) : 'Skipped auto-deploy'}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to create Visualforce Page: ${error.message}` }],
        };
      }
    }
  );

  // create_component
  server.tool(
    'create_vf_component',
    'Create a new Visualforce Component',
    {
      componentName: sfDevNameSchema.describe('Name of the Visualforce Component'),
      content: z.string().describe('Body content of the Visualforce Component (starting with <apex:component>)'),
      label: z.string().optional().describe('Label of the component'),
      apiVersion: z.string().optional().describe('API Version (default 60.0)'),
      autoDeploy: z.boolean().optional().default(true).describe('Automatically deploy to default org'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const apiVersion = params.apiVersion || '60.0';
        const label = params.label || params.componentName;
        const autoDeploy = params.autoDeploy !== false;

        const compPath = getMetadataPath('components', `${params.componentName}.component`);
        const metaPath = getMetadataPath('components', `${params.componentName}.component-meta.xml`);

        const metaXml = buildMetadataXml('ApexComponent', {
          apiVersion,
          description: `Visualforce Component ${params.componentName}`,
          label,
        });

        await writeFile(compPath, params.content);
        await writeFile(metaPath, metaXml);

        let deployResult;
        if (autoDeploy) {
          deployResult = await DeploymentService.deploy({
            metadata: [`ApexComponent:${params.componentName}`],
            targetOrg: params.targetOrg,
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: `Visualforce Component '${params.componentName}' created locally.\n` +
                    `File paths:\n${compPath}\n${metaPath}\n\n` +
                    `Deployment status: ${deployResult ? JSON.stringify(deployResult, null, 2) : 'Skipped auto-deploy'}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to create Visualforce Component: ${error.message}` }],
        };
      }
    }
  );
}
