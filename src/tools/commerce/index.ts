import { McpServer } from '../../server.js';
import { z } from 'zod';
import { JSForceService } from '../../services/JSForceService.js';

export function registerCommerceTools(server: McpServer): void {
  // list_experience_sites
  server.tool(
    'list_experience_sites',
    'List Experience Cloud Sites and Community Portals in the Salesforce org',
    {
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        // Query ExperienceBundle or Site
        const siteQuery = 'SELECT Id, Name, Subdomain, UrlPathPrefix, Status FROM Site';
        const siteResult = await JSForceService.query(siteQuery, false, params.targetOrg);
        
        let bundleResult = { records: [] };
        try {
          const bundleQuery = 'SELECT Id, DeveloperName, MasterLabel, Status FROM ExperienceBundle';
          bundleResult = await JSForceService.query(bundleQuery, true, params.targetOrg);
        } catch (e) {
          // ExperienceBundle might not be enabled in all orgs
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                sites: siteResult.records,
                experienceBundles: bundleResult.records
              }, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list Experience sites: ${error.message}` }],
        };
      }
    }
  );

  // list_commerce_products
  server.tool(
    'list_commerce_products',
    'List B2B Commerce Products configured in the org',
    {
      limit: z.number().optional().default(10),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const query = `SELECT Id, Name, ProductCode, IsActive, Description FROM Product2 LIMIT ${params.limit}`;
        const result = await JSForceService.query(query, false, params.targetOrg);
        return {
          content: [{ type: 'text', text: JSON.stringify(result.records, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to query products: ${error.message}` }],
        };
      }
    }
  );

  // list_commerce_categories
  server.tool(
    'list_commerce_categories',
    'List B2B Commerce Product Categories',
    {
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const query = 'SELECT Id, Name, Description, ParentCategoryId FROM ProductCategory';
        const result = await JSForceService.query(query, false, params.targetOrg);
        return {
          content: [{ type: 'text', text: JSON.stringify(result.records, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to query categories: ${error.message}` }],
        };
      }
    }
  );

  // list_buyer_groups
  server.tool(
    'list_buyer_groups',
    'List Commerce Buyer Groups in the org',
    {
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const query = 'SELECT Id, Name, Description FROM BuyerGroup';
        const result = await JSForceService.query(query, false, params.targetOrg);
        return {
          content: [{ type: 'text', text: JSON.stringify(result.records, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to query buyer groups: ${error.message}` }],
        };
      }
    }
  );

  // list_web_stores
  server.tool(
    'list_web_stores',
    'List Web Stores configured in B2B/B2C Commerce',
    {
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const query = 'SELECT Id, Name, Description, Type, Status FROM WebStore';
        const result = await JSForceService.query(query, false, params.targetOrg);
        return {
          content: [{ type: 'text', text: JSON.stringify(result.records, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to query WebStores: ${error.message}` }],
        };
      }
    }
  );
}
