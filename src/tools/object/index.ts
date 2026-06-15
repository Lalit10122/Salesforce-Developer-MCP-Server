import { McpServer } from '../../server.js';
import { z } from 'zod';
import { MetadataService } from '../../services/MetadataService.js';
import { sfDevNameSchema } from '../../utils/validation.js';

export function registerObjectTools(server: McpServer): void {
  server.tool(
    'create_custom_object',
    'Create a new Custom Object metadata file and deploy it',
    {
      objectName: sfDevNameSchema.describe('Developer/API Name of the custom object (e.g. Invoice, Project__c)'),
      label: z.string().describe('Label of the object'),
      pluralLabel: z.string().describe('Plural Label of the object'),
      nameFieldType: z.enum(['Text', 'AutoNumber']).default('Text').describe('Name Field Type'),
      nameFieldLabel: z.string().describe('Label of the Name field'),
      nameFieldFormat: z.string().optional().describe('Display format (required if AutoNumber, e.g. INV-{0000})'),
      description: z.string().optional().describe('Description of the custom object'),
      autoDeploy: z.boolean().optional().default(true).describe('Automatically deploy to default org'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const result = await MetadataService.createCustomObject(
          params.objectName,
          params.label,
          params.pluralLabel,
          {
            type: params.nameFieldType,
            label: params.nameFieldLabel,
            nameFieldFormat: params.nameFieldFormat,
          },
          {
            autoDeploy: params.autoDeploy,
            targetOrg: params.targetOrg,
            description: params.description,
          }
        );

        return {
          content: [
            {
              type: 'text',
              text: `Custom Object '${params.objectName}' created locally.\n` +
                    `File paths:\n${result.filePaths.join('\n')}\n\n` +
                    `Deployment status: ${result.deployResult ? JSON.stringify(result.deployResult, null, 2) : 'Skipped auto-deploy'}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to create Custom Object: ${error.message}` }],
        };
      }
    }
  );
}
