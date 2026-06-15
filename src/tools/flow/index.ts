import { McpServer } from '../../server.js';
import { z } from 'zod';
import { getMetadataPath, writeFile } from '../../utils/file.js';
import { buildMetadataXml } from '../../utils/xml.js';
import { DeploymentService } from '../../services/DeploymentService.js';
import { sfDevNameSchema } from '../../utils/validation.js';

export function registerFlowTools(server: McpServer): void {
  server.tool(
    'create_flow',
    'Create a Screen Flow, Record-Triggered Flow, or Auto-Launched Flow metadata file and deploy it',
    {
      flowName: sfDevNameSchema.describe('Developer API name of the Flow'),
      label: z.string().describe('Flow Label'),
      flowType: z.enum(['Flow', 'AutoLaunchedFlow']).default('Flow').describe('Type of flow (Flow = Screen flow/Record-triggered, AutoLaunchedFlow = autolaunched)'),
      description: z.string().optional().describe('Description'),
      
      // Auto-generated basic record-triggered structure if provided
      triggerSobject: z.string().optional().describe('SObject API name triggering the flow (e.g. Account, customObject__c)'),
      triggerType: z.enum(['Create', 'Update', 'CreateAndUpdate', 'Delete']).optional().describe('Type of record trigger'),
      triggerRoute: z.enum(['BeforeSave', 'AfterSave']).optional().describe('Fast Field Updates (BeforeSave) vs Actions and Related Records (AfterSave)'),
      
      rawXml: z.string().optional().describe('Raw XML flow metadata body. If provided, ignores trigger templates and writes directly.'),
      autoDeploy: z.boolean().optional().default(true).describe('Automatically deploy flow to Salesforce org'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const flowPath = getMetadataPath('flows', `${params.flowName}.flow-meta.xml`);
        let xmlContent = '';

        if (params.rawXml) {
          xmlContent = params.rawXml;
        } else {
          // Construct basic Flow skeleton
          const flowObj: Record<string, any> = {
            apiVersion: '60.0',
            description: params.description || `Flow ${params.label}`,
            label: params.label,
            processType: params.flowType === 'AutoLaunchedFlow' ? 'AutoLaunchedFlow' : 'Flow',
            status: 'Active',
          };

          // If record triggered template
          if (params.triggerSobject && params.triggerType) {
            flowObj.start = {
              object: params.triggerSobject,
              recordTriggerType: params.triggerType,
              triggerType: 'RecordAfterSave', // default
            };
            if (params.triggerRoute === 'BeforeSave') {
              flowObj.start.triggerType = 'RecordBeforeSave';
            }
          }

          xmlContent = buildMetadataXml('Flow', flowObj);
        }

        await writeFile(flowPath, xmlContent);

        let deployResult;
        if (params.autoDeploy) {
          deployResult = await DeploymentService.deploy({
            metadata: [`Flow:${params.flowName}`],
            targetOrg: params.targetOrg,
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: `Flow '${params.flowName}' created locally.\n` +
                    `File path:\n${flowPath}\n\n` +
                    `Deployment status: ${deployResult ? JSON.stringify(deployResult, null, 2) : 'Skipped auto-deploy'}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to create Flow: ${error.message}` }],
        };
      }
    }
  );
}
