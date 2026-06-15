import { McpServer } from '../../server.js';
import { z } from 'zod';
import { getMetadataPath, writeFile } from '../../utils/file.js';
import { buildMetadataXml } from '../../utils/xml.js';
import { DeploymentService } from '../../services/DeploymentService.js';
import { SalesforceCLIService } from '../../services/SalesforceCLIService.js';
import { sfDevNameSchema } from '../../utils/validation.js';

export function registerPermissionTools(server: McpServer): void {
  server.tool(
    'create_permission_set',
    'Create a Permission Set metadata file and deploy it',
    {
      permissionSetName: sfDevNameSchema.describe('Developer API name of the Permission Set'),
      label: z.string().describe('Label of the Permission Set'),
      description: z.string().optional().describe('Description'),
      
      classAccesses: z.array(z.string()).optional().describe('Names of Apex classes to grant access to'),
      objectPermissions: z.array(z.object({
        objectName: z.string().describe('API Name of the SObject (e.g. Account, customObject__c)'),
        allowCreate: z.boolean().default(true),
        allowRead: z.boolean().default(true),
        allowEdit: z.boolean().default(true),
        allowDelete: z.boolean().default(false),
        viewAllRecords: z.boolean().default(false),
        modifyAllRecords: z.boolean().default(false),
      })).optional().describe('List of object level permissions'),
      
      fieldPermissions: z.array(z.object({
        field: z.string().describe('Fully qualified Field name (e.g. Account.Industry, customObject__c.customField__c)'),
        readable: z.boolean().default(true),
        editable: z.boolean().default(true),
      })).optional().describe('List of field level permissions'),

      applicationVisibilities: z.array(z.object({
        application: z.string().describe('API Name of the custom application'),
        visible: z.boolean().default(true),
      })).optional().describe('List of application visibilities'),

      tabSettings: z.array(z.object({
        tab: z.string().describe('API Name of the tab (e.g. Account, customObject__c)'),
        visibility: z.enum(['Visible', 'Available', 'None']).default('Visible'),
      })).optional().describe('List of tab settings/visibilities'),

      autoDeploy: z.boolean().optional().default(true).describe('Automatically deploy permission set to org'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const psPath = getMetadataPath('permissionsets', `${params.permissionSetName}.permissionset-meta.xml`);

        const psObj: Record<string, any> = {
          hasActivationRequired: 'false',
          label: params.label,
        };

        if (params.description) {
          psObj.description = params.description;
        }

        if (params.classAccesses && params.classAccesses.length > 0) {
          psObj.classAccesses = params.classAccesses.map(cls => ({
            apexClass: cls,
            enabled: 'true',
          }));
        }

        if (params.objectPermissions && params.objectPermissions.length > 0) {
          psObj.objectPermissions = params.objectPermissions.map(obj => ({
            allowCreate: obj.allowCreate ? 'true' : 'false',
            allowDelete: obj.allowDelete ? 'true' : 'false',
            allowEdit: obj.allowEdit ? 'true' : 'false',
            allowRead: obj.allowRead ? 'true' : 'false',
            modifyAllRecords: obj.modifyAllRecords ? 'true' : 'false',
            object: obj.objectName,
            viewAllRecords: obj.viewAllRecords ? 'true' : 'false',
          }));
        }

        if (params.fieldPermissions && params.fieldPermissions.length > 0) {
          psObj.fieldPermissions = params.fieldPermissions.map(fp => ({
            editable: fp.editable ? 'true' : 'false',
            field: fp.field,
            readable: fp.readable ? 'true' : 'false',
          }));
        }

        if (params.applicationVisibilities && params.applicationVisibilities.length > 0) {
          psObj.applicationVisibilities = params.applicationVisibilities.map(app => ({
            application: app.application,
            visible: app.visible ? 'true' : 'false',
          }));
        }

        if (params.tabSettings && params.tabSettings.length > 0) {
          psObj.tabSettings = params.tabSettings.map(ts => ({
            tab: ts.tab,
            visibility: ts.visibility,
          }));
        }

        const xmlContent = buildMetadataXml('PermissionSet', psObj);
        await writeFile(psPath, xmlContent);

        let deployResult;
        if (params.autoDeploy) {
          deployResult = await DeploymentService.deploy({
            metadata: [`PermissionSet:${params.permissionSetName}`],
            targetOrg: params.targetOrg,
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: `Permission Set '${params.permissionSetName}' created locally.\n` +
                    `File path:\n${psPath}\n\n` +
                    `Deployment status: ${deployResult ? JSON.stringify(deployResult, null, 2) : 'Skipped auto-deploy'}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to create Permission Set: ${error.message}` }],
        };
      }
    }
  );

  // assign_permission_set
  server.tool(
    'assign_permission_set',
    'Assign a Permission Set to one or more users in the org using Salesforce CLI',
    {
      permissionSetName: sfDevNameSchema.describe('Developer API name of the Permission Set to assign'),
      onBehalfOf: z.array(z.string()).optional().describe('List of usernames or aliases to assign the permission set to (defaults to the default login user)'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const args = ['org', 'assign', 'permset', '--name', params.permissionSetName, '--json'];
        
        if (params.onBehalfOf && params.onBehalfOf.length > 0) {
          args.push('--on-behalf-of', params.onBehalfOf.join(','));
        }
        if (params.targetOrg) {
          args.push('--target-org', params.targetOrg);
        }

        const result = await SalesforceCLIService.executeJson<any>(args);
        return {
          content: [
            {
              type: 'text',
              text: `Permission Set assignment succeeded:\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to assign Permission Set: ${error.message}\n${error.stderr || ''}`,
            },
          ],
        };
      }
    }
  );
}
