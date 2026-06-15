import { McpServer } from '../../server.js';
import { z } from 'zod';
import { MetadataService } from '../../services/MetadataService.js';
import { sfDevNameSchema } from '../../utils/validation.js';

export function registerAuraTools(server: McpServer): void {
  // create_component
  server.tool(
    'create_aura_component',
    'Create a new Aura Component',
    {
      auraName: sfDevNameSchema.describe('Name of the Aura Component'),
      cmpContent: z.string().optional().describe('CMP file code content'),
      controllerContent: z.string().optional().describe('JS Controller code content'),
      helperContent: z.string().optional().describe('JS Helper code content'),
      styleContent: z.string().optional().describe('CSS Style code content'),
      apiVersion: z.string().optional().describe('API Version (default 60.0)'),
      autoDeploy: z.boolean().optional().default(true).describe('Automatically deploy to default org'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const defaultCmp = `<aura:component>\n    <!-- Aura Component Content -->\n</aura:component>`;
        const defaultCtrl = `({\n    myAction : function(component, event, helper) {\n        \n    }\n})`;
        const defaultHelper = `({\n    helperMethod : function() {\n        \n    }\n})`;
        const defaultStyle = `.THIS {\n}`;

        const files = {
          cmp: params.cmpContent || defaultCmp,
          controller: params.controllerContent || defaultCtrl,
          helper: params.helperContent || defaultHelper,
          style: params.styleContent || defaultStyle,
        };

        const result = await MetadataService.createAura(params.auraName, files, {
          apiVersion: params.apiVersion,
          autoDeploy: params.autoDeploy,
          targetOrg: params.targetOrg,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Aura Component '${params.auraName}' created locally.\n` +
                    `File paths:\n${result.filePaths.join('\n')}\n\n` +
                    `Deployment status: ${result.deployResult ? JSON.stringify(result.deployResult, null, 2) : 'Skipped auto-deploy'}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to create Aura Component: ${error.message}` }],
        };
      }
    }
  );

  // create_aura_application
  server.tool(
    'create_aura_application',
    'Create a new Aura Application',
    {
      auraName: sfDevNameSchema.describe('Name of the Aura Application'),
      appContent: z.string().optional().describe('APP file code content'),
      controllerContent: z.string().optional().describe('JS Controller code content'),
      helperContent: z.string().optional().describe('JS Helper code content'),
      styleContent: z.string().optional().describe('CSS Style code content'),
      apiVersion: z.string().optional().describe('API Version (default 60.0)'),
      autoDeploy: z.boolean().optional().default(true).describe('Automatically deploy to default org'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const defaultApp = `<aura:application>\n    <!-- Aura Application Content -->\n</aura:application>`;
        const defaultCtrl = `({\n    myAction : function(component, event, helper) {\n        \n    }\n})`;
        const defaultHelper = `({\n    helperMethod : function() {\n        \n    }\n})`;
        const defaultStyle = `.THIS {\n}`;

        const files = {
          app: params.appContent || defaultApp,
          controller: params.controllerContent || defaultCtrl,
          helper: params.helperContent || defaultHelper,
          style: params.styleContent || defaultStyle,
        };

        const result = await MetadataService.createAura(params.auraName, files, {
          apiVersion: params.apiVersion,
          autoDeploy: params.autoDeploy,
          targetOrg: params.targetOrg,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Aura Application '${params.auraName}' created locally.\n` +
                    `File paths:\n${result.filePaths.join('\n')}\n\n` +
                    `Deployment status: ${result.deployResult ? JSON.stringify(result.deployResult, null, 2) : 'Skipped auto-deploy'}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to create Aura Application: ${error.message}` }],
        };
      }
    }
  );

  // create_aura_event
  server.tool(
    'create_aura_event',
    'Create a new Aura Event',
    {
      auraName: sfDevNameSchema.describe('Name of the Aura Event'),
      evtContent: z.string().optional().describe('EVT file code content'),
      apiVersion: z.string().optional().describe('API Version (default 60.0)'),
      autoDeploy: z.boolean().optional().default(true).describe('Automatically deploy to default org'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const defaultEvt = `<aura:event type="APPLICATION" description="Event template">\n    <!-- Aura Event Content -->\n</aura:event>`;
        
        const files = {
          evt: params.evtContent || defaultEvt,
        };

        const result = await MetadataService.createAura(params.auraName, files, {
          apiVersion: params.apiVersion,
          autoDeploy: params.autoDeploy,
          targetOrg: params.targetOrg,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Aura Event '${params.auraName}' created locally.\n` +
                    `File paths:\n${result.filePaths.join('\n')}\n\n` +
                    `Deployment status: ${result.deployResult ? JSON.stringify(result.deployResult, null, 2) : 'Skipped auto-deploy'}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to create Aura Event: ${error.message}` }],
        };
      }
    }
  );
}
