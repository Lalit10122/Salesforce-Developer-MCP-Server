import { McpServer } from '../../server.js';
import { z } from 'zod';
import { JSForceService } from '../../services/JSForceService.js';
import { SalesforceCLIService } from '../../services/SalesforceCLIService.js';

export function registerDebugTools(server: McpServer): void {
  // list_debug_logs
  server.tool(
    'list_debug_logs',
    'List recent debug logs from the Salesforce org',
    {
      limit: z.number().optional().default(10).describe('Number of logs to return (default 10)'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const query = `SELECT Id, LogUserId, LogUser.Name, Application, DurationMilliseconds, StartTime, Location, Operation, Request, Status FROM ApexLog ORDER BY StartTime DESC LIMIT ${params.limit}`;
        const result = await JSForceService.query(query, true, params.targetOrg);
        return {
          content: [{ type: 'text', text: JSON.stringify(result.records, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list debug logs: ${error.message}` }],
        };
      }
    }
  );

  // get_debug_log
  server.tool(
    'get_debug_log',
    'Get full body content of a specific debug log',
    {
      logId: z.string().describe('ID of the ApexLog to retrieve'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        // Fetching via sf CLI is easiest because it does the REST download of body directly
        const args = ['apex', 'get', 'log', '--log-id', params.logId, '--json'];
        if (params.targetOrg) {
          args.push('--target-org', params.targetOrg);
        }

        const result = await SalesforceCLIService.executeJson<any>(args);
        // The result structure has the log body content in result[0].log or body
        const logContent = Array.isArray(result) ? result[0]?.log || JSON.stringify(result) : result.log || JSON.stringify(result);
        return {
          content: [{ type: 'text', text: logContent }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to retrieve debug log: ${error.message}` }],
        };
      }
    }
  );

  // list_trace_flags
  server.tool(
    'list_trace_flags',
    'List all debug Trace Flags currently set in the org',
    {
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const query = 'SELECT Id, LogType, TracedEntityId, TracedEntity.Name, StartDate, ExpirationDate, DebugLevelId, DebugLevel.DeveloperName FROM TraceFlag';
        const result = await JSForceService.query(query, true, params.targetOrg);
        return {
          content: [{ type: 'text', text: JSON.stringify(result.records, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list trace flags: ${error.message}` }],
        };
      }
    }
  );

  // create_trace_flag
  server.tool(
    'create_trace_flag',
    'Set a Trace Flag to collect debug logs for a user or class',
    {
      tracedEntityId: z.string().describe('ID of User, ApexClass, or ApexTrigger to trace'),
      debugLevelId: z.string().describe('ID of the DebugLevel record specifying log levels'),
      logType: z.enum(['USER_DEBUG', 'CLASS_TRACING', 'DEVELOPER_LOG']).default('USER_DEBUG'),
      expirationDurationMinutes: z.number().optional().default(30).describe('Minutes before the trace expires (max 24 hours)'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const conn = await JSForceService.getConnection(params.targetOrg);
        const startDate = new Date();
        const expirationDate = new Date(startDate.getTime() + params.expirationDurationMinutes * 60 * 1000);

        const record = {
          TracedEntityId: params.tracedEntityId,
          DebugLevelId: params.debugLevelId,
          LogType: params.logType,
          StartDate: startDate.toISOString(),
          ExpirationDate: expirationDate.toISOString(),
        };

        const result = await conn.tooling.sobject('TraceFlag').create(record);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to create trace flag: ${error.message}` }],
        };
      }
    }
  );

  // delete_trace_flag
  server.tool(
    'delete_trace_flag',
    'Delete a Trace Flag by ID',
    {
      traceFlagId: z.string().describe('ID of the TraceFlag to delete'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const conn = await JSForceService.getConnection(params.targetOrg);
        const result = await conn.tooling.sobject('TraceFlag').destroy(params.traceFlagId);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to delete trace flag: ${error.message}` }],
        };
      }
    }
  );
}
