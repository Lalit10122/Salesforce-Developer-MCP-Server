import { McpServer } from '../../server.js';
import { z } from 'zod';
import { JSForceService } from '../../services/JSForceService.js';

export function registerDataTools(server: McpServer): void {
  // execute_soql
  server.tool(
    'execute_soql',
    'Execute a SOQL query in Salesforce',
    {
      query: z.string().describe('SOQL query string to execute'),
      useTooling: z.boolean().optional().default(false).describe('Use Salesforce Tooling API instead of standard REST API'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const result = await JSForceService.query(params.query, params.useTooling, params.targetOrg);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `SOQL execution failed: ${error.message}` }],
        };
      }
    }
  );

  // execute_sosl
  server.tool(
    'execute_sosl',
    'Execute a SOSL search in Salesforce',
    {
      searchString: z.string().describe('SOSL search string to execute (e.g. FIND {test} IN ALL FIELDS RETURNING Account(Id, Name))'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const result = await JSForceService.search(params.searchString, params.targetOrg);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `SOSL search failed: ${error.message}` }],
        };
      }
    }
  );

  // describe_object
  server.tool(
    'describe_object',
    'Get metadata description for a Salesforce SObject (fields, record types, limits, relationships)',
    {
      objectName: z.string().describe('SObject API Name (e.g. Account, Custom_Object__c)'),
      useTooling: z.boolean().optional().default(false).describe('Use Tooling API'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const result = await JSForceService.describe(params.objectName, params.useTooling, params.targetOrg);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Object describe failed: ${error.message}` }],
        };
      }
    }
  );

  // query_plan
  server.tool(
    'query_plan',
    'Retrieve the query optimization plan for a SOQL query',
    {
      query: z.string().describe('SOQL query to analyze'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const result = await JSForceService.queryPlan(params.query, params.targetOrg);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Query plan retrieve failed: ${error.message}` }],
        };
      }
    }
  );

  // create_record
  server.tool(
    'create_record',
    'Create a record (or list of records) in Salesforce',
    {
      objectName: z.string().describe('SObject API Name'),
      records: z.union([z.record(z.any()), z.array(z.record(z.any()))]).describe('Single record object or array of record objects to create'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const result = await JSForceService.create(params.objectName, params.records, params.targetOrg);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Record creation failed: ${error.message}` }],
        };
      }
    }
  );

  // update_record
  server.tool(
    'update_record',
    'Update a record (or list of records) in Salesforce',
    {
      objectName: z.string().describe('SObject API Name'),
      records: z.union([z.record(z.any()), z.array(z.record(z.any()))]).describe('Record or records to update (must contain ID)'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const result = await JSForceService.update(params.objectName, params.records, params.targetOrg);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Record update failed: ${error.message}` }],
        };
      }
    }
  );

  // delete_record
  server.tool(
    'delete_record',
    'Delete one or more records in Salesforce',
    {
      objectName: z.string().describe('SObject API Name'),
      ids: z.union([z.string(), z.array(z.string())]).describe('Record ID or array of Record IDs to delete'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const result = await JSForceService.delete(params.objectName, params.ids, params.targetOrg);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Record deletion failed: ${error.message}` }],
        };
      }
    }
  );

  // get_record
  server.tool(
    'get_record',
    'Retrieve specific records by ID from Salesforce',
    {
      objectName: z.string().describe('SObject API Name'),
      ids: z.union([z.string(), z.array(z.string())]).describe('Record ID or array of IDs'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const result = await JSForceService.retrieve(params.objectName, params.ids, params.targetOrg);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Record retrieval failed: ${error.message}` }],
        };
      }
    }
  );

  // bulk_insert
  server.tool(
    'bulk_insert',
    'Bulk insert records into Salesforce (high volume)',
    {
      objectName: z.string().describe('SObject API Name'),
      records: z.array(z.record(z.any())).describe('Array of records to insert'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const result = await JSForceService.bulk(params.objectName, 'insert', params.records, params.targetOrg);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Bulk insert failed: ${error.message}` }],
        };
      }
    }
  );

  // bulk_update
  server.tool(
    'bulk_update',
    'Bulk update records in Salesforce',
    {
      objectName: z.string().describe('SObject API Name'),
      records: z.array(z.record(z.any())).describe('Array of records to update (must contain Id)'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const result = await JSForceService.bulk(params.objectName, 'update', params.records, params.targetOrg);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Bulk update failed: ${error.message}` }],
        };
      }
    }
  );

  // bulk_delete
  server.tool(
    'bulk_delete',
    'Bulk delete records in Salesforce',
    {
      objectName: z.string().describe('SObject API Name'),
      records: z.array(z.object({ Id: z.string() })).describe('Array of records containing Id to delete'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const result = await JSForceService.bulk(params.objectName, 'delete', params.records, params.targetOrg);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Bulk delete failed: ${error.message}` }],
        };
      }
    }
  );
}
