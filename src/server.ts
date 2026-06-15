import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { registerOrgTools } from './tools/org/index.js';
import { registerApexTools } from './tools/apex/index.js';
import { registerLwcTools } from './tools/lwc/index.js';
import { registerAuraTools } from './tools/aura/index.js';
import { registerVisualforceTools } from './tools/visualforce/index.js';
import { registerMetadataTools } from './tools/metadata/index.js';
import { registerObjectTools } from './tools/object/index.js';
import { registerFieldTools } from './tools/field/index.js';
import { registerDeployTools } from './tools/deploy/index.js';
import { registerRetrieveTools } from './tools/retrieve/index.js';
import { registerDataTools } from './tools/data/index.js';
import { registerAnonymousApexTools } from './tools/anonymous/index.js';
import { registerTestTools } from './tools/tests/index.js';
import { registerDebugTools } from './tools/debug/index.js';
import { registerGitTools } from './tools/git/index.js';
import { registerLabelTools } from './tools/labels/index.js';
import { registerCommerceTools } from './tools/commerce/index.js';
import { registerFlowTools } from './tools/flow/index.js';
import { registerPermissionTools } from './tools/permissions/index.js';
import { LoggerService } from './services/LoggerService.js';

function zodToJsonSchema(schema: z.ZodType<any>): any {
  if (!(schema instanceof z.ZodObject)) {
    return { type: 'object', properties: {} };
  }

  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(schema.shape)) {
    const valType = value as z.ZodTypeAny;
    let typeStr = 'string';
    const desc = valType.description;

    let innerType = valType;
    let isOptional = false;

    if (innerType instanceof z.ZodOptional || innerType.constructor.name === 'ZodOptional') {
      innerType = (innerType as any).unwrap();
      isOptional = true;
    }
    if (innerType instanceof z.ZodNullable || innerType.constructor.name === 'ZodNullable') {
      innerType = (innerType as any).unwrap();
    }
    if (innerType instanceof z.ZodDefault || innerType.constructor.name === 'ZodDefault') {
      innerType = (innerType as any)._def.innerType;
      isOptional = true;
    }

    if (!isOptional) {
      required.push(key);
    }

    if (innerType instanceof z.ZodString) {
      typeStr = 'string';
    } else if (innerType instanceof z.ZodNumber) {
      typeStr = 'number';
    } else if (innerType instanceof z.ZodBoolean) {
      typeStr = 'boolean';
    } else if (innerType instanceof z.ZodEnum) {
      typeStr = 'string';
      properties[key] = {
        type: typeStr,
        description: desc,
        enum: innerType._def.values,
      };
      continue;
    } else if (innerType instanceof z.ZodArray) {
      typeStr = 'array';
      properties[key] = {
        type: typeStr,
        description: desc,
        items: { type: 'string' },
      };
      continue;
    } else if (innerType instanceof z.ZodUnion) {
      properties[key] = {
        description: desc,
      };
      continue;
    } else {
      typeStr = 'object';
    }

    properties[key] = {
      type: typeStr,
      description: desc,
    };
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
  };
}

export class McpServer {
  private baseServer: Server;
  private toolsMap: Map<
    string,
    {
      description: string;
      schema: z.ZodObject<any>;
      handler: (params: any) => Promise<any>;
    }
  > = new Map();

  constructor(info: { name: string; version: string }) {
    this.baseServer = new Server(info, {
      capabilities: {
        tools: {},
      },
    });

    this.baseServer.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = Array.from(this.toolsMap.entries()).map(([name, tool]) => ({
        name,
        description: tool.description,
        inputSchema: zodToJsonSchema(tool.schema),
      }));
      return { tools };
    });

    this.baseServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const tool = this.toolsMap.get(name);
      if (!tool) {
        throw new Error(`Tool ${name} not found`);
      }

      try {
        const parsedArgs = tool.schema.parse(args || {});
        return await tool.handler(parsedArgs);
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: error.message }],
        };
      }
    });
  }

  public tool<T extends z.ZodRawShape>(
    name: string,
    description: string,
    schema: T,
    handler: (params: z.infer<z.ZodObject<T>>) => Promise<any>
  ): void {
    const zodSchema = z.object(schema);
    this.toolsMap.set(name, {
      description,
      schema: zodSchema,
      handler,
    });
  }

  public async connect(transport: any): Promise<void> {
    await this.baseServer.connect(transport);
  }
}

export const server = new McpServer({
  name: 'salesforce-dev-mcp',
  version: '1.0.0',
});

// Register all tools
registerOrgTools(server);
registerApexTools(server);
registerLwcTools(server);
registerAuraTools(server);
registerVisualforceTools(server);
registerMetadataTools(server);
registerObjectTools(server);
registerFieldTools(server);
registerDeployTools(server);
registerRetrieveTools(server);
registerDataTools(server);
registerAnonymousApexTools(server);
registerTestTools(server);
registerDebugTools(server);
registerGitTools(server);
registerLabelTools(server);
registerCommerceTools(server);
registerFlowTools(server);
registerPermissionTools(server);

export async function runServer(): Promise<void> {
  LoggerService.info('Initializing Salesforce Developer MCP Server...');
  const transport = new StdioServerTransport();
  await server.connect(transport);
  LoggerService.info('Salesforce Developer MCP Server successfully connected via Stdio.');
}
