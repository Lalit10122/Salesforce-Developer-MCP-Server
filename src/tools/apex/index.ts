import { McpServer } from '../../server.js';
import { z } from 'zod';
import { MetadataService } from '../../services/MetadataService.js';
import { JSForceService } from '../../services/JSForceService.js';
import { DeploymentService } from '../../services/DeploymentService.js';
import { getMetadataPath, readFile, writeFile, deleteFile, exists } from '../../utils/file.js';
import { sfDevNameSchema } from '../../utils/validation.js';

export function registerApexTools(server: McpServer): void {
  // create_apex_class
  server.tool(
    'create_apex_class',
    'Create a new Apex Class and optionally deploy it',
    {
      className: sfDevNameSchema.describe('Name of the Apex class'),
      content: z.string().describe('Body of the Apex class code'),
      apiVersion: z.string().optional().describe('Salesforce API version (default 60.0)'),
      autoDeploy: z.boolean().optional().default(true).describe('Automatically deploy to default org'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const result = await MetadataService.createApexClass(params.className, params.content, {
          apiVersion: params.apiVersion,
          autoDeploy: params.autoDeploy,
          targetOrg: params.targetOrg,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Apex class '${params.className}' created locally.\n` +
                    `File paths:\n${result.filePaths.join('\n')}\n\n` +
                    `Deployment status: ${result.deployResult ? JSON.stringify(result.deployResult, null, 2) : 'Skipped auto-deploy'}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to create Apex Class: ${error.message}` }],
        };
      }
    }
  );

  // update_apex_class
  server.tool(
    'update_apex_class',
    'Update an existing local Apex Class and deploy it',
    {
      className: sfDevNameSchema.describe('Name of the Apex class'),
      content: z.string().describe('Updated body of the Apex class code'),
      autoDeploy: z.boolean().optional().default(true).describe('Automatically deploy to default org'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const clsPath = getMetadataPath('classes', `${params.className}.cls`);
        if (!(await exists(clsPath))) {
          throw new Error(`Apex class '${params.className}' does not exist locally.`);
        }

        await writeFile(clsPath, params.content);

        let deployResult;
        if (params.autoDeploy) {
          deployResult = await DeploymentService.deploy({
            metadata: [`ApexClass:${params.className}`],
            targetOrg: params.targetOrg,
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: `Apex class '${params.className}' updated locally.\n` +
                    `Deployment status: ${deployResult ? JSON.stringify(deployResult, null, 2) : 'Skipped auto-deploy'}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to update Apex Class: ${error.message}` }],
        };
      }
    }
  );

  // delete_apex_class
  server.tool(
    'delete_apex_class',
    'Delete an Apex Class locally and optionally from the Salesforce org',
    {
      className: sfDevNameSchema.describe('Name of the Apex class to delete'),
      autoDeploy: z.boolean().optional().default(true).describe('Automatically delete from the org using Tooling API'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const clsPath = getMetadataPath('classes', `${params.className}.cls`);
        const metaPath = getMetadataPath('classes', `${params.className}.cls-meta.xml`);

        if (await exists(clsPath)) await deleteFile(clsPath);
        if (await exists(metaPath)) await deleteFile(metaPath);

        let deleteStatus = 'Deleted locally.';

        if (params.autoDeploy) {
          try {
            const queryResult = await JSForceService.query(
              `SELECT Id FROM ApexClass WHERE Name = '${params.className}'`,
              true,
              params.targetOrg
            );
            if (queryResult.records && queryResult.records.length > 0) {
              const classId = queryResult.records[0].Id;
              const conn = await JSForceService.getConnection(params.targetOrg);
              await conn.tooling.sobject('ApexClass').destroy(classId);
              deleteStatus += ' Deleted from Salesforce org via Tooling API.';
            } else {
              deleteStatus += ' Not found in the Salesforce org, no remote deletion needed.';
            }
          } catch (apiError: any) {
            deleteStatus += ` Remote deletion failed: ${apiError.message}`;
          }
        }

        return {
          content: [{ type: 'text', text: deleteStatus }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to delete Apex Class: ${error.message}` }],
        };
      }
    }
  );

  // retrieve_apex_class
  server.tool(
    'retrieve_apex_class',
    'Retrieve an Apex Class content from the local workspace or the org',
    {
      className: sfDevNameSchema.describe('Name of the Apex class'),
      fromOrg: z.boolean().optional().default(false).describe('Retrieve from Salesforce org rather than local workspace'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        if (params.fromOrg) {
          // Retrieve using JSForce Tooling API to get body directly without complex manifest retrieval
          const queryResult = await JSForceService.query(
            `SELECT Body, ApiVersion, Status FROM ApexClass WHERE Name = '${params.className}'`,
            true,
            params.targetOrg
          );
          if (!queryResult.records || queryResult.records.length === 0) {
            throw new Error(`Apex class '${params.className}' not found in Salesforce org.`);
          }
          return {
            content: [
              {
                type: 'text',
                text: `Apex Class: ${params.className}\nAPI Version: ${queryResult.records[0].ApiVersion}\nStatus: ${queryResult.records[0].Status}\n\nBody:\n${queryResult.records[0].Body}`,
              },
            ],
          };
        } else {
          // Read local file
          const clsPath = getMetadataPath('classes', `${params.className}.cls`);
          if (!(await exists(clsPath))) {
            throw new Error(`Apex class '${params.className}' does not exist locally.`);
          }
          const content = await readFile(clsPath);
          return {
            content: [{ type: 'text', text: content }],
          };
        }
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to retrieve Apex Class: ${error.message}` }],
        };
      }
    }
  );

  // explain_apex
  server.tool(
    'explain_apex',
    'Read an Apex class and structure metadata for explanations',
    {
      className: sfDevNameSchema.describe('Name of the Apex class to explain'),
    },
    async (params) => {
      try {
        const clsPath = getMetadataPath('classes', `${params.className}.cls`);
        if (!(await exists(clsPath))) {
          throw new Error(`Apex class '${params.className}' does not exist locally.`);
        }
        const code = await readFile(clsPath);
        return {
          content: [
            {
              type: 'text',
              text: `Below is the code for the Apex class '${params.className}'. Please explain its functionality, key methods, logic, and potential edge cases.\n\n\`\`\`apex\n${code}\n\`\`\``,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to load Apex Class: ${error.message}` }],
        };
      }
    }
  );

  // optimize_apex
  server.tool(
    'optimize_apex',
    'Read an Apex class and structure metadata for optimization suggestions',
    {
      className: sfDevNameSchema.describe('Name of the Apex class to optimize'),
    },
    async (params) => {
      try {
        const clsPath = getMetadataPath('classes', `${params.className}.cls`);
        if (!(await exists(clsPath))) {
          throw new Error(`Apex class '${params.className}' does not exist locally.`);
        }
        const code = await readFile(clsPath);
        return {
          content: [
            {
              type: 'text',
              text: `Below is the code for the Apex class '${params.className}'. Please analyze it and provide recommendations for:
1. Performance improvements (SOQL in loops, caching, collections processing)
2. Security issues (FLS/CRUD checks, sharing rules, SOQL injection)
3. Governance limits optimization (CPU time, heap size, DML limits)
4. Code readability and clean patterns

\`\`\`apex\n${code}\n\`\`\``,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to load Apex Class: ${error.message}` }],
        };
      }
    }
  );

  // create_trigger
  server.tool(
    'create_trigger',
    'Create an Apex Trigger',
    {
      triggerName: sfDevNameSchema.describe('Name of the Trigger'),
      sobject: sfDevNameSchema.describe('API Name of the Target SObject'),
      events: z.array(z.enum([
        'before insert', 'before update', 'before delete',
        'after insert', 'after update', 'after delete', 'after undelete'
      ])).describe('Trigger events'),
      content: z.string().describe('Trigger logic body'),
      apiVersion: z.string().optional().describe('Salesforce API version (default 60.0)'),
      autoDeploy: z.boolean().optional().default(true).describe('Automatically deploy to default org'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const result = await MetadataService.createTrigger(
          params.triggerName,
          params.sobject,
          params.events,
          params.content,
          {
            apiVersion: params.apiVersion,
            autoDeploy: params.autoDeploy,
            targetOrg: params.targetOrg,
          }
        );

        return {
          content: [
            {
              type: 'text',
              text: `Trigger '${params.triggerName}' created locally.\n` +
                    `File paths:\n${result.filePaths.join('\n')}\n\n` +
                    `Deployment status: ${result.deployResult ? JSON.stringify(result.deployResult, null, 2) : 'Skipped auto-deploy'}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to create Trigger: ${error.message}` }],
        };
      }
    }
  );

  // update_trigger
  server.tool(
    'update_trigger',
    'Update an existing local Trigger and deploy it',
    {
      triggerName: sfDevNameSchema.describe('Name of the Trigger'),
      sobject: sfDevNameSchema.describe('API Name of the SObject'),
      events: z.array(z.string()).describe('Trigger events'),
      content: z.string().describe('Updated trigger logic body'),
      autoDeploy: z.boolean().optional().default(true).describe('Automatically deploy to default org'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const triggerPath = getMetadataPath('triggers', `${params.triggerName}.trigger`);
        if (!(await exists(triggerPath))) {
          throw new Error(`Trigger '${params.triggerName}' does not exist locally.`);
        }

        const triggerBody = `trigger ${params.triggerName} on ${params.sobject} (${params.events.join(', ')}) {\n${params.content}\n}`;
        await writeFile(triggerPath, triggerBody);

        let deployResult;
        if (params.autoDeploy) {
          deployResult = await DeploymentService.deploy({
            metadata: [`ApexTrigger:${params.triggerName}`],
            targetOrg: params.targetOrg,
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: `Trigger '${params.triggerName}' updated locally.\n` +
                    `Deployment status: ${deployResult ? JSON.stringify(deployResult, null, 2) : 'Skipped auto-deploy'}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to update Trigger: ${error.message}` }],
        };
      }
    }
  );

  // delete_trigger
  server.tool(
    'delete_trigger',
    'Delete a Trigger locally and from the Salesforce org',
    {
      triggerName: sfDevNameSchema.describe('Name of the trigger to delete'),
      autoDeploy: z.boolean().optional().default(true).describe('Automatically delete from org using Tooling API'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const triggerPath = getMetadataPath('triggers', `${params.triggerName}.trigger`);
        const metaPath = getMetadataPath('triggers', `${params.triggerName}.trigger-meta.xml`);

        if (await exists(triggerPath)) await deleteFile(triggerPath);
        if (await exists(metaPath)) await deleteFile(metaPath);

        let deleteStatus = 'Deleted locally.';

        if (params.autoDeploy) {
          try {
            const queryResult = await JSForceService.query(
              `SELECT Id FROM ApexTrigger WHERE Name = '${params.triggerName}'`,
              true,
              params.targetOrg
            );
            if (queryResult.records && queryResult.records.length > 0) {
              const triggerId = queryResult.records[0].Id;
              const conn = await JSForceService.getConnection(params.targetOrg);
              await conn.tooling.sobject('ApexTrigger').destroy(triggerId);
              deleteStatus += ' Deleted from Salesforce org via Tooling API.';
            } else {
              deleteStatus += ' Not found in the Salesforce org, no remote deletion needed.';
            }
          } catch (apiError: any) {
            deleteStatus += ` Remote deletion failed: ${apiError.message}`;
          }
        }

        return {
          content: [{ type: 'text', text: deleteStatus }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to delete Trigger: ${error.message}` }],
        };
      }
    }
  );
}
