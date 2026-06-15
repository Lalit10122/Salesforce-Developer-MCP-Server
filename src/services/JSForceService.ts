import { Connection } from 'jsforce';
import { SalesforceCLIService } from './SalesforceCLIService.js';
import { SalesforceAPIError } from '../utils/errors.js';
import { LoggerService } from './LoggerService.js';

interface OrgDisplayResult {
  accessToken: string;
  instanceUrl: string;
  username: string;
  id: string;
}

export class JSForceService {
  private static connections: Map<string, Connection> = new Map();

  /**
   * Retrieves or builds a JSForce connection using the Salesforce CLI credentials.
   * If targetOrg is omitted, it retrieves the connection for the default/target org.
   */
  public static async getConnection(targetOrg?: string): Promise<Connection> {
    const cacheKey = targetOrg || 'default';
    if (this.connections.has(cacheKey)) {
      return this.connections.get(cacheKey)!;
    }

    try {
      const args = ['org', 'display'];
      if (targetOrg) {
        args.push('--target-org', targetOrg);
      }
      
      const orgInfo = await SalesforceCLIService.executeJson<OrgDisplayResult>(args);
      
      if (!orgInfo.accessToken || !orgInfo.instanceUrl) {
        throw new SalesforceAPIError('Auth token or instance URL not returned by CLI org display');
      }

      const conn = new Connection({
        instanceUrl: orgInfo.instanceUrl,
        accessToken: orgInfo.accessToken,
        version: '60.0',
      });

      this.connections.set(cacheKey, conn);
      LoggerService.info({ username: orgInfo.username, instanceUrl: orgInfo.instanceUrl }, 'Established JSForce connection');
      return conn;
    } catch (error: any) {
      LoggerService.error({ error }, 'Failed to initialize JSForce connection');
      throw new SalesforceAPIError(`Failed to authenticate JSForce using CLI credentials: ${error.message}`, undefined, error);
    }
  }

  /**
   * Executes a SOQL query.
   */
  public static async query(query: string, useTooling = false, targetOrg?: string): Promise<any> {
    const conn = await this.getConnection(targetOrg);
    const targetApi = useTooling ? conn.tooling : conn;
    
    try {
      LoggerService.debug({ query, useTooling }, 'Executing SOQL query');
      return await targetApi.query(query);
    } catch (error: any) {
      throw new SalesforceAPIError(`SOQL query failed: ${error.message}`, error.errorCode, error);
    }
  }

  /**
   * Executes a SOSL search.
   */
  public static async search(searchString: string, targetOrg?: string): Promise<any> {
    const conn = await this.getConnection(targetOrg);
    try {
      LoggerService.debug({ searchString }, 'Executing SOSL search');
      return await conn.search(searchString);
    } catch (error: any) {
      throw new SalesforceAPIError(`SOSL search failed: ${error.message}`, error.errorCode, error);
    }
  }

  /**
   * Describes an sObject.
   */
  public static async describe(sobject: string, useTooling = false, targetOrg?: string): Promise<any> {
    const conn = await this.getConnection(targetOrg);
    const targetApi = useTooling ? conn.tooling : conn;
    try {
      return await targetApi.describe(sobject);
    } catch (error: any) {
      throw new SalesforceAPIError(`Describe failed for ${sobject}: ${error.message}`, error.errorCode, error);
    }
  }

  /**
   * Standard CRUD Operations.
   */
  public static async create(sobject: string, records: any | any[], targetOrg?: string): Promise<any> {
    const conn = await this.getConnection(targetOrg);
    try {
      return await conn.sobject(sobject).create(records);
    } catch (error: any) {
      throw new SalesforceAPIError(`Record creation failed: ${error.message}`, error.errorCode, error);
    }
  }

  public static async update(sobject: string, records: any | any[], targetOrg?: string): Promise<any> {
    const conn = await this.getConnection(targetOrg);
    try {
      return await conn.sobject(sobject).update(records);
    } catch (error: any) {
      throw new SalesforceAPIError(`Record update failed: ${error.message}`, error.errorCode, error);
    }
  }

  public static async delete(sobject: string, ids: string | string[], targetOrg?: string): Promise<any> {
    const conn = await this.getConnection(targetOrg);
    try {
      return await conn.sobject(sobject).destroy(ids);
    } catch (error: any) {
      throw new SalesforceAPIError(`Record deletion failed: ${error.message}`, error.errorCode, error);
    }
  }

  public static async retrieve(sobject: string, ids: string | string[], targetOrg?: string): Promise<any> {
    const conn = await this.getConnection(targetOrg);
    try {
      return await conn.sobject(sobject).retrieve(ids);
    } catch (error: any) {
      throw new SalesforceAPIError(`Record retrieval failed: ${error.message}`, error.errorCode, error);
    }
  }

  /**
   * Bulk API Operations (Insert, Update, Delete)
   */
  public static async bulk(sobject: string, action: 'insert' | 'update' | 'delete', records: any[], targetOrg?: string): Promise<any> {
    const conn = await this.getConnection(targetOrg);
    try {
      LoggerService.info({ sobject, action, recordCount: records.length }, 'Executing Bulk API job');
      // JSForce Bulk API v1/v2
      return await conn.bulk.load(sobject, action, records);
    } catch (error: any) {
      throw new SalesforceAPIError(`Bulk API operation failed: ${error.message}`, error.errorCode, error);
    }
  }

  /**
   * Explains a query execution plan
   */
  public static async queryPlan(query: string, targetOrg?: string): Promise<any> {
    const conn = await this.getConnection(targetOrg);
    try {
      // Explain API endpoint query explanation
      const url = `/services/data/v60.0/query/?explain=${encodeURIComponent(query)}`;
      return await conn.request({ method: 'GET', url });
    } catch (error: any) {
      throw new SalesforceAPIError(`Query explanation plan failed: ${error.message}`, error.statusCode, error);
    }
  }

  /**
   * Executes a generic REST API request
   */
  public static async request(requestOptions: any, targetOrg?: string): Promise<any> {
    const conn = await this.getConnection(targetOrg);
    try {
      return await conn.request(requestOptions);
    } catch (error: any) {
      throw new SalesforceAPIError(`REST API request failed: ${error.message}`, error.statusCode, error);
    }
  }
}
