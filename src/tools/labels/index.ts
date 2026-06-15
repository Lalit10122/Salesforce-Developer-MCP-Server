import { McpServer } from '../../server.js';
import { z } from 'zod';
import { create } from 'xmlbuilder2';
import { getMetadataPath, writeFile, readFile, exists } from '../../utils/file.js';
import { DeploymentService } from '../../services/DeploymentService.js';
import { sfDevNameSchema } from '../../utils/validation.js';

export function registerLabelTools(server: McpServer): void {
  // Helper to upsert a label in CustomLabels.labels-meta.xml
  const upsertLabel = async (
    fullName: string,
    labelData: {
      categories?: string;
      language?: string;
      protectedValue?: boolean;
      shortDescription: string;
      value: string;
    }
  ) => {
    const labelsPath = getMetadataPath('labels', 'CustomLabels.labels-meta.xml');
    let rootObj: any = {
      CustomLabels: {
        '@xmlns': 'http://soap.sforce.com/2006/04/metadata',
        labels: [],
      },
    };

    if (await exists(labelsPath)) {
      const fileContent = await readFile(labelsPath);
      try {
        const parsed = create(fileContent).toObject() as any;
        if (parsed && parsed.CustomLabels) {
          rootObj = parsed;
          if (!rootObj.CustomLabels.labels) {
            rootObj.CustomLabels.labels = [];
          } else if (!Array.isArray(rootObj.CustomLabels.labels)) {
            rootObj.CustomLabels.labels = [rootObj.CustomLabels.labels];
          }
        }
      } catch (parseError) {
        // Fallback to fresh file if parsing fails
      }
    }

    // Check if label already exists
    const labelsList = rootObj.CustomLabels.labels;
    const existingIndex = labelsList.findIndex((item: any) => item.fullName === fullName);

    const newLabel = {
      fullName,
      categories: labelData.categories || '',
      language: labelData.language || 'en_US',
      protected: labelData.protectedValue !== undefined ? String(labelData.protectedValue) : 'false',
      shortDescription: labelData.shortDescription,
      value: labelData.value,
    };

    if (existingIndex > -1) {
      labelsList[existingIndex] = newLabel;
    } else {
      labelsList.push(newLabel);
    }

    const xmlString = create({ version: '1.0', encoding: 'UTF-8' }, rootObj)
      .end({ prettyPrint: true, indent: '    ' });

    await writeFile(labelsPath, xmlString);
    return labelsPath;
  };

  // create_custom_label
  server.tool(
    'create_custom_label',
    'Create a new Custom Label or append it to the CustomLabels file',
    {
      labelName: sfDevNameSchema.describe('Developer API name of the custom label'),
      value: z.string().describe('Value of the custom label'),
      shortDescription: z.string().describe('Short description (used as the label in UI)'),
      categories: z.string().optional().describe('Comma separated categories'),
      language: z.string().optional().default('en_US').describe('Language code (default en_US)'),
      protectedValue: z.boolean().optional().default(false).describe('Whether label is protected'),
      autoDeploy: z.boolean().optional().default(true).describe('Automatically deploy labels file to org'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const labelsPath = await upsertLabel(params.labelName, {
          categories: params.categories,
          language: params.language,
          protectedValue: params.protectedValue,
          shortDescription: params.shortDescription,
          value: params.value,
        });

        let deployResult;
        if (params.autoDeploy) {
          deployResult = await DeploymentService.deploy({
            metadata: ['CustomLabels'],
            targetOrg: params.targetOrg,
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: `Custom Label '${params.labelName}' upserted in CustomLabels.labels-meta.xml.\n` +
                    `File path: ${labelsPath}\n\n` +
                    `Deployment status: ${deployResult ? JSON.stringify(deployResult, null, 2) : 'Skipped auto-deploy'}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to create Custom Label: ${error.message}` }],
        };
      }
    }
  );

  // update_custom_label
  server.tool(
    'update_custom_label',
    'Update an existing Custom Label value or properties',
    {
      labelName: sfDevNameSchema.describe('Developer API name of the custom label to update'),
      value: z.string().describe('New value of the custom label'),
      shortDescription: z.string().describe('Updated short description'),
      categories: z.string().optional().describe('Updated categories'),
      language: z.string().optional().describe('Language'),
      protectedValue: z.boolean().optional().describe('Protected status'),
      autoDeploy: z.boolean().optional().default(true).describe('Automatically deploy labels file to org'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const labelsPath = getMetadataPath('labels', 'CustomLabels.labels-meta.xml');
        if (!(await exists(labelsPath))) {
          throw new Error(`CustomLabels file does not exist. Create a label first.`);
        }

        const labelsPathResult = await upsertLabel(params.labelName, {
          categories: params.categories,
          language: params.language,
          protectedValue: params.protectedValue,
          shortDescription: params.shortDescription,
          value: params.value,
        });

        let deployResult;
        if (params.autoDeploy) {
          deployResult = await DeploymentService.deploy({
            metadata: ['CustomLabels'],
            targetOrg: params.targetOrg,
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: `Custom Label '${params.labelName}' updated in CustomLabels.labels-meta.xml.\n` +
                    `Deployment status: ${deployResult ? JSON.stringify(deployResult, null, 2) : 'Skipped auto-deploy'}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to update Custom Label: ${error.message}` }],
        };
      }
    }
  );
}
