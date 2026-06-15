import { McpServer } from '../../server.js';
import { z } from 'zod';
import { MetadataService } from '../../services/MetadataService.js';
import { sfDevNameSchema } from '../../utils/validation.js';

export function registerFieldTools(server: McpServer): void {
  server.tool(
    'create_custom_field',
    'Create a new Custom Field on an Object',
    {
      objectName: sfDevNameSchema.describe('API Name of the target SObject (e.g. Account, Invoice__c)'),
      fieldName: sfDevNameSchema.describe('API Name of the custom field to create (e.g. Amount__c, Notes__c)'),
      type: z.enum([
        'Text', 'TextArea', 'LongTextArea', 'Html', 'Number', 'Currency', 
        'Percent', 'Checkbox', 'Date', 'DateTime', 'Email', 'Phone', 
        'Url', 'Lookup', 'MasterDetail', 'Picklist', 'MultiselectPicklist'
      ]).describe('Salesforce Field Type'),
      label: z.string().describe('Field UI Label'),
      required: z.boolean().optional().default(false).describe('Whether field is required'),
      description: z.string().optional().describe('Description of field'),
      inlineHelpText: z.string().optional().describe('Help text'),
      
      // Type specific configurations
      length: z.number().optional().describe('Length (for Text, TextArea, LongTextArea, Html)'),
      visibleLines: z.number().optional().describe('Visible lines (for LongTextArea, Html, MultiselectPicklist)'),
      precision: z.number().optional().describe('Precision (for Number, Currency, Percent)'),
      scale: z.number().optional().describe('Scale (for Number, Currency, Percent)'),
      defaultValue: z.string().optional().describe('Default value expression'),
      
      // Relationship (Lookup / MasterDetail)
      referenceTo: z.string().optional().describe('Referenced object (e.g. Account, customObject__c)'),
      relationshipName: z.string().optional().describe('Relationship Name (plural, e.g. Invoices)'),
      relationshipLabel: z.string().optional().describe('Relationship Label'),
      writeRequiresMasterRead: z.boolean().optional().describe('Write requires master read (for MasterDetail)'),
      
      // Picklist values
      picklistValues: z.array(z.string()).optional().describe('Array of values (for Picklist or MultiselectPicklist)'),
      
      autoDeploy: z.boolean().optional().default(true).describe('Automatically deploy to default org'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const cleanFieldName = params.fieldName.endsWith('__c') ? params.fieldName : `${params.fieldName}__c`;
        const fieldMetadata: Record<string, any> = {
          fullName: cleanFieldName,
          type: params.type,
          label: params.label,
          required: params.required ? 'true' : 'false',
        };

        if (params.description) fieldMetadata.description = params.description;
        if (params.inlineHelpText) fieldMetadata.inlineHelpText = params.inlineHelpText;

        // Apply type-specific properties
        switch (params.type) {
          case 'Text':
            fieldMetadata.length = params.length || 255;
            break;
          case 'TextArea':
            break;
          case 'LongTextArea':
          case 'Html':
            fieldMetadata.length = params.length || 32768;
            fieldMetadata.visibleLines = params.visibleLines || 3;
            break;
          case 'Number':
          case 'Currency':
          case 'Percent':
            fieldMetadata.precision = params.precision || 18;
            fieldMetadata.scale = params.scale || 0;
            break;
          case 'Checkbox':
            fieldMetadata.defaultValue = params.defaultValue !== undefined ? params.defaultValue : 'false';
            break;
          case 'Lookup':
          case 'MasterDetail':
            if (!params.referenceTo) {
              throw new Error(`'referenceTo' is required for ${params.type} field.`);
            }
            fieldMetadata.referenceTo = params.referenceTo;
            fieldMetadata.relationshipName = params.relationshipName || `${params.fieldName.replace('__c', '')}Relationship`;
            fieldMetadata.relationshipLabel = params.relationshipLabel || params.label;
            if (params.type === 'MasterDetail') {
              fieldMetadata.writeRequiresMasterRead = params.writeRequiresMasterRead !== false ? 'true' : 'false';
            }
            break;
          case 'Picklist':
          case 'MultiselectPicklist':
            if (!params.picklistValues || params.picklistValues.length === 0) {
              throw new Error(`'picklistValues' must be provided for Picklist fields.`);
            }
            if (params.type === 'MultiselectPicklist') {
              fieldMetadata.visibleLines = params.visibleLines || 4;
            }
            
            // Generate standard valueSet structure
            fieldMetadata.valueSet = {
              valueSetDefinition: {
                sorted: 'false',
                value: params.picklistValues.map(val => ({
                  fullName: val,
                  default: 'false',
                  label: val
                }))
              }
            };
            break;
        }

        const result = await MetadataService.createCustomField(
          params.objectName,
          params.fieldName,
          fieldMetadata,
          {
            autoDeploy: params.autoDeploy,
            targetOrg: params.targetOrg,
          }
        );

        return {
          content: [
            {
              type: 'text',
              text: `Custom Field '${params.fieldName}' created on object '${params.objectName}' locally.\n` +
                    `File paths:\n${result.filePaths.join('\n')}\n\n` +
                    `Deployment status: ${result.deployResult ? JSON.stringify(result.deployResult, null, 2) : 'Skipped auto-deploy'}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to create Custom Field: ${error.message}` }],
        };
      }
    }
  );
}
