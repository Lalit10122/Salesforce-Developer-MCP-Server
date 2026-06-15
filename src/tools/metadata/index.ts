import { McpServer } from '../../server.js';
import { z } from 'zod';
import path from 'path';
import { create } from 'xmlbuilder2';
import { DeploymentService } from '../../services/DeploymentService.js';
import { getMetadataPath, writeFile, readFile, exists } from '../../utils/file.js';
import { buildMetadataXml } from '../../utils/xml.js';
import { sfDevNameSchema } from '../../utils/validation.js';

export function registerMetadataTools(server: McpServer): void {
  // create_record_type
  server.tool(
    'create_record_type',
    'Create a new Record Type for a Custom Object',
    {
      objectName: sfDevNameSchema.describe('Target SObject API Name'),
      recordTypeName: sfDevNameSchema.describe('API Name of the record type'),
      label: z.string().describe('Record Type Label'),
      active: z.boolean().optional().default(true).describe('Active status'),
      description: z.string().optional().describe('Description'),
      autoDeploy: z.boolean().optional().default(true).describe('Auto deploy'),
      targetOrg: z.string().optional().describe('Target org'),
    },
    async (params) => {
      try {
        const cleanObjName = params.objectName.endsWith('__c') ? params.objectName : `${params.objectName}__c`;
        const rtPath = getMetadataPath('objects', cleanObjName, 'recordTypes', `${params.recordTypeName}.recordType-meta.xml`);

        const rtXml = buildMetadataXml('RecordType', {
          active: params.active ? 'true' : 'false',
          label: params.label,
          description: params.description || `Record Type ${params.label}`,
        });

        await writeFile(rtPath, rtXml);

        let deployResult;
        if (params.autoDeploy) {
          deployResult = await DeploymentService.deploy({
            metadata: [`RecordType:${cleanObjName}.${params.recordTypeName}`],
            targetOrg: params.targetOrg,
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: `Record Type '${params.recordTypeName}' created.\nPath: ${rtPath}\n\nDeploy status: ${JSON.stringify(deployResult, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        return { isError: true, content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }
  );

  // create_validation_rule
  server.tool(
    'create_validation_rule',
    'Create a validation rule on an Object',
    {
      objectName: sfDevNameSchema.describe('Target SObject API Name'),
      ruleName: sfDevNameSchema.describe('Validation Rule API Name'),
      errorConditionFormula: z.string().describe('Formula evaluating to true on error'),
      errorMessage: z.string().describe('Validation error message to display'),
      errorDisplayField: z.string().optional().describe('Field on which to show the error'),
      active: z.boolean().optional().default(true).describe('Active status'),
      autoDeploy: z.boolean().optional().default(true).describe('Auto deploy'),
      targetOrg: z.string().optional().describe('Target org'),
    },
    async (params) => {
      try {
        const cleanObjName = params.objectName.endsWith('__c') ? params.objectName : `${params.objectName}__c`;
        const vrPath = getMetadataPath('objects', cleanObjName, 'validationRules', `${params.ruleName}.validationRule-meta.xml`);

        const vrXml = buildMetadataXml('ValidationRule', {
          active: params.active ? 'true' : 'false',
          errorConditionFormula: params.errorConditionFormula,
          errorMessage: params.errorMessage,
          errorDisplayField: params.errorDisplayField || '',
        });

        await writeFile(vrPath, vrXml);

        let deployResult;
        if (params.autoDeploy) {
          deployResult = await DeploymentService.deploy({
            metadata: [`ValidationRule:${cleanObjName}.${params.ruleName}`],
            targetOrg: params.targetOrg,
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: `Validation Rule '${params.ruleName}' created.\nPath: ${vrPath}\n\nDeploy status: ${JSON.stringify(deployResult, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        return { isError: true, content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }
  );

  // create_global_value_set
  server.tool(
    'create_global_value_set',
    'Create a Global Value Set for Picklists',
    {
      valueSetName: sfDevNameSchema.describe('Global Value Set Developer Name'),
      label: z.string().describe('Label of the value set'),
      values: z.array(z.string()).describe('List of values in the set'),
      autoDeploy: z.boolean().optional().default(true).describe('Auto deploy'),
      targetOrg: z.string().optional().describe('Target org'),
    },
    async (params) => {
      try {
        const gvsPath = getMetadataPath('globalValueSets', `${params.valueSetName}.globalValueSet-meta.xml`);

        const gvsXml = buildMetadataXml('GlobalValueSet', {
          masterLabel: params.label,
          sorted: 'false',
          customValue: params.values.map(val => ({
            fullName: val,
            default: 'false',
            label: val,
          })),
        });

        await writeFile(gvsPath, gvsXml);

        let deployResult;
        if (params.autoDeploy) {
          deployResult = await DeploymentService.deploy({
            metadata: [`GlobalValueSet:${params.valueSetName}`],
            targetOrg: params.targetOrg,
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: `Global Value Set '${params.valueSetName}' created.\nPath: ${gvsPath}\n\nDeploy status: ${JSON.stringify(deployResult, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        return { isError: true, content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }
  );

  // create_custom_metadata_type
  server.tool(
    'create_custom_metadata_type',
    'Create a Custom Metadata Type object (__mdt)',
    {
      metadataTypeName: sfDevNameSchema.describe('Custom Metadata Type Developer Name (without suffix)'),
      label: z.string().describe('Label of the metadata type'),
      pluralLabel: z.string().describe('Plural Label'),
      description: z.string().optional().describe('Description'),
      autoDeploy: z.boolean().optional().default(true).describe('Auto deploy'),
      targetOrg: z.string().optional().describe('Target org'),
    },
    async (params) => {
      try {
        const cleanName = params.metadataTypeName.endsWith('__mdt') 
          ? params.metadataTypeName 
          : `${params.metadataTypeName}__mdt`;

        const mdtPath = getMetadataPath('objects', cleanName, `${cleanName}.object-meta.xml`);

        const mdtXml = buildMetadataXml('CustomObject', {
          visibility: 'Public',
          label: params.label,
          pluralLabel: params.pluralLabel,
          description: params.description || `Custom Metadata Type ${params.label}`,
        });

        await writeFile(mdtPath, mdtXml);

        let deployResult;
        if (params.autoDeploy) {
          deployResult = await DeploymentService.deploy({
            metadata: [`CustomObject:${cleanName}`],
            targetOrg: params.targetOrg,
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: `Custom Metadata Type '${cleanName}' created.\nPath: ${mdtPath}\n\nDeploy status: ${JSON.stringify(deployResult, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        return { isError: true, content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }
  );

  // create_custom_tab
  server.tool(
    'create_custom_tab',
    'Create a Custom Tab for an Object',
    {
      objectName: sfDevNameSchema.describe('Target SObject API Name'),
      motif: z.string().default('Custom55: Books').describe('Tab Icon/Motif (e.g. Custom62: Chalkboard, Custom55: Books)'),
      autoDeploy: z.boolean().optional().default(true).describe('Auto deploy'),
      targetOrg: z.string().optional().describe('Target org'),
    },
    async (params) => {
      try {
        const cleanObjName = params.objectName.endsWith('__c') ? params.objectName : `${params.objectName}__c`;
        const tabPath = getMetadataPath('tabs', `${cleanObjName}.tab-meta.xml`);

        const tabXml = buildMetadataXml('CustomTab', {
          customObject: 'true',
          motif: params.motif,
        });

        await writeFile(tabPath, tabXml);

        let deployResult;
        if (params.autoDeploy) {
          deployResult = await DeploymentService.deploy({
            metadata: [`CustomTab:${cleanObjName}`],
            targetOrg: params.targetOrg,
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: `Custom Tab for object '${cleanObjName}' created.\nPath: ${tabPath}\n\nDeploy status: ${JSON.stringify(deployResult, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        return { isError: true, content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }
  );

  // create_compact_layout
  server.tool(
    'create_compact_layout',
    'Create a Compact Layout for a Custom Object',
    {
      objectName: sfDevNameSchema.describe('Target SObject API Name'),
      layoutName: sfDevNameSchema.describe('Compact Layout Developer Name'),
      label: z.string().describe('Compact Layout Label'),
      fields: z.array(z.string()).describe('List of SObject Field API Names to display'),
      autoDeploy: z.boolean().optional().default(true).describe('Auto deploy'),
      targetOrg: z.string().optional().describe('Target org'),
    },
    async (params) => {
      try {
        const cleanObjName = params.objectName.endsWith('__c') ? params.objectName : `${params.objectName}__c`;
        const clPath = getMetadataPath('objects', cleanObjName, 'compactLayouts', `${params.layoutName}.compactLayout-meta.xml`);

        const clXml = buildMetadataXml('CompactLayout', {
          fullName: params.layoutName,
          label: params.label,
          fields: params.fields,
        });

        await writeFile(clPath, clXml);

        let deployResult;
        if (params.autoDeploy) {
          deployResult = await DeploymentService.deploy({
            metadata: [`CompactLayout:${cleanObjName}.${params.layoutName}`],
            targetOrg: params.targetOrg,
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: `Compact Layout '${params.layoutName}' created.\nPath: ${clPath}\n\nDeploy status: ${JSON.stringify(deployResult, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        return { isError: true, content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }
  );

  // create_page_layout
  server.tool(
    'create_page_layout',
    'Create a basic Page Layout for an Object',
    {
      objectName: sfDevNameSchema.describe('Target SObject API Name'),
      layoutName: sfDevNameSchema.describe('Page Layout Developer Name'),
      autoDeploy: z.boolean().optional().default(true).describe('Auto deploy'),
      targetOrg: z.string().optional().describe('Target org'),
    },
    async (params) => {
      try {
        const cleanObjName = params.objectName.endsWith('__c') ? params.objectName : `${params.objectName}__c`;
        const layoutFileName = `${cleanObjName}-${params.layoutName}.layout-meta.xml`;
        const layoutPath = getMetadataPath('layouts', layoutFileName);

        // Standard PageLayout skeleton
        const layoutXml = buildMetadataXml('Layout', {
          layoutSections: [
            {
              customLabel: 'false',
              detailHeading: 'false',
              editHeading: 'true',
              label: 'Information',
              layoutColumns: [
                {
                  layoutItems: [
                    {
                      behavior: 'Required',
                      field: 'Name',
                    },
                  ],
                },
              ],
              style: 'TwoColumnsTopToBottom',
            },
          ],
        });

        await writeFile(layoutPath, layoutXml);

        let deployResult;
        if (params.autoDeploy) {
          deployResult = await DeploymentService.deploy({
            metadata: [`Layout:${cleanObjName}-${params.layoutName}`],
            targetOrg: params.targetOrg,
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: `Page Layout '${layoutFileName}' created.\nPath: ${layoutPath}\n\nDeploy status: ${JSON.stringify(deployResult, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        return { isError: true, content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }
  );

  // create_custom_application
  server.tool(
    'create_custom_application',
    'Create a new Custom Application (Lightning App) metadata file and deploy it',
    {
      appName: sfDevNameSchema.describe('Developer API name of the application'),
      label: z.string().describe('Label of the application'),
      description: z.string().optional().describe('Description of the application'),
      tabs: z.array(z.string()).optional().default(['standard-home']).describe('List of Tab API Names to include in the navigation menu'),
      navType: z.enum(['Standard', 'Console']).default('Standard').describe('Navigation type'),
      autoDeploy: z.boolean().optional().default(true).describe('Auto deploy'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const appPath = getMetadataPath('applications', `${params.appName}.app-meta.xml`);

        const appXml = buildMetadataXml('CustomApplication', {
          formFactors: ['Large'],
          label: params.label,
          navType: params.navType,
          tab: params.tabs,
          description: params.description || `Custom Lightning App ${params.label}`,
        });

        await writeFile(appPath, appXml);

        let deployResult;
        if (params.autoDeploy) {
          deployResult = await DeploymentService.deploy({
            metadata: [`CustomApplication:${params.appName}`],
            targetOrg: params.targetOrg,
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: `Custom Application '${params.appName}' created.\nPath: ${appPath}\n\nDeploy status: ${JSON.stringify(deployResult, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        return { isError: true, content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }
  );
}
