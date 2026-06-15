import path from 'path';
import { getMetadataPath, writeFile, deleteFile } from '../utils/file.js';
import { buildMetadataXml } from '../utils/xml.js';
import { DeploymentService, DeployResult } from './DeploymentService.js';
import { LoggerService } from './LoggerService.js';
import { MetadataError } from '../utils/errors.js';

export interface MetadataCreationResult {
  filePaths: string[];
  deployResult?: DeployResult;
}

export class MetadataService {
  /**
   * Helper to execute auto-deployment if requested.
   */
  private static async handleAutoDeploy(
    filePaths: string[],
    metadataString: string,
    autoDeploy: boolean,
    targetOrg?: string
  ): Promise<DeployResult | undefined> {
    if (!autoDeploy) return undefined;
    LoggerService.info({ metadataString }, 'Auto-deploying created metadata');
    return await DeploymentService.deploy({
      metadata: [metadataString],
      targetOrg,
    });
  }

  /**
   * Creates an Apex Class (cls + cls-meta.xml).
   */
  public static async createApexClass(
    className: string,
    content: string,
    options: { apiVersion?: string; autoDeploy?: boolean; targetOrg?: string } = {}
  ): Promise<MetadataCreationResult> {
    const apiVersion = options.apiVersion || '60.0';
    const autoDeploy = options.autoDeploy !== false; // default true

    const clsPath = getMetadataPath('classes', `${className}.cls`);
    const metaPath = getMetadataPath('classes', `${className}.cls-meta.xml`);

    const metaXml = buildMetadataXml('ApexClass', {
      apiVersion,
      status: 'Active',
    });

    LoggerService.info({ className }, 'Writing Apex Class files locally');
    await writeFile(clsPath, content);
    await writeFile(metaPath, metaXml);

    const filePaths = [clsPath, metaPath];
    const deployResult = await this.handleAutoDeploy(
      filePaths,
      `ApexClass:${className}`,
      autoDeploy,
      options.targetOrg
    );

    return { filePaths, deployResult };
  }

  /**
   * Creates an Apex Trigger (trigger + trigger-meta.xml).
   */
  public static async createTrigger(
    triggerName: string,
    sobject: string,
    events: string[], // e.g. ['before insert', 'after update']
    content: string,
    options: { apiVersion?: string; autoDeploy?: boolean; targetOrg?: string } = {}
  ): Promise<MetadataCreationResult> {
    const apiVersion = options.apiVersion || '60.0';
    const autoDeploy = options.autoDeploy !== false;

    const triggerPath = getMetadataPath('triggers', `${triggerName}.trigger`);
    const metaPath = getMetadataPath('triggers', `${triggerName}.trigger-meta.xml`);

    const triggerBody = `trigger ${triggerName} on ${sobject} (${events.join(', ')}) {\n${content}\n}`;

    const metaXml = buildMetadataXml('ApexTrigger', {
      apiVersion,
      status: 'Active',
    });

    LoggerService.info({ triggerName }, 'Writing Apex Trigger files locally');
    await writeFile(triggerPath, triggerBody);
    await writeFile(metaPath, metaXml);

    const filePaths = [triggerPath, metaPath];
    const deployResult = await this.handleAutoDeploy(
      filePaths,
      `ApexTrigger:${triggerName}`,
      autoDeploy,
      options.targetOrg
    );

    return { filePaths, deployResult };
  }

  /**
   * Creates an LWC Component.
   */
  public static async createLwc(
    lwcName: string,
    files: { html?: string; js?: string; css?: string; jsMetaXml?: string },
    options: { autoDeploy?: boolean; targetOrg?: string } = {}
  ): Promise<MetadataCreationResult> {
    const autoDeploy = options.autoDeploy !== false;
    const folderPath = getMetadataPath('lwc', lwcName);
    const filePaths: string[] = [];

    LoggerService.info({ lwcName }, 'Creating LWC folder and files');

    if (files.html !== undefined) {
      const p = path.join(folderPath, `${lwcName}.html`);
      await writeFile(p, files.html);
      filePaths.push(p);
    }
    if (files.js !== undefined) {
      const p = path.join(folderPath, `${lwcName}.js`);
      await writeFile(p, files.js);
      filePaths.push(p);
    }
    if (files.css !== undefined) {
      const p = path.join(folderPath, `${lwcName}.css`);
      await writeFile(p, files.css);
      filePaths.push(p);
    }

    const metaXml = files.jsMetaXml || buildMetadataXml('LightningComponentBundle', {
      apiVersion: '60.0',
      isExposed: 'true',
      masterLabel: lwcName,
      targets: {
        target: [
          'lightning__RecordPage',
          'lightning__AppPage',
          'lightning__HomePage',
        ],
      },
    });

    const metaPath = path.join(folderPath, `${lwcName}.js-meta.xml`);
    await writeFile(metaPath, metaXml);
    filePaths.push(metaPath);

    const deployResult = await this.handleAutoDeploy(
      filePaths,
      `LightningComponentBundle:${lwcName}`,
      autoDeploy,
      options.targetOrg
    );

    return { filePaths, deployResult };
  }

  /**
   * Creates an Aura Component.
   */
  public static async createAura(
    auraName: string,
    files: { cmp?: string; app?: string; evt?: string; controller?: string; helper?: string; style?: string; design?: string; svg?: string },
    options: { apiVersion?: string; autoDeploy?: boolean; targetOrg?: string } = {}
  ): Promise<MetadataCreationResult> {
    const apiVersion = options.apiVersion || '60.0';
    const autoDeploy = options.autoDeploy !== false;
    const folderPath = getMetadataPath('aura', auraName);
    const filePaths: string[] = [];

    LoggerService.info({ auraName }, 'Creating Aura bundle files');

    // CMP (Component)
    if (files.cmp !== undefined) {
      const p = path.join(folderPath, `${auraName}.cmp`);
      await writeFile(p, files.cmp);
      filePaths.push(p);
    }
    // APP (Application)
    if (files.app !== undefined) {
      const p = path.join(folderPath, `${auraName}.app`);
      await writeFile(p, files.app);
      filePaths.push(p);
    }
    // EVT (Event)
    if (files.evt !== undefined) {
      const p = path.join(folderPath, `${auraName}.evt`);
      await writeFile(p, files.evt);
      filePaths.push(p);
    }
    // JS Controller
    if (files.controller !== undefined) {
      const p = path.join(folderPath, `${auraName}Controller.js`);
      await writeFile(p, files.controller);
      filePaths.push(p);
    }
    // JS Helper
    if (files.helper !== undefined) {
      const p = path.join(folderPath, `${auraName}Helper.js`);
      await writeFile(p, files.helper);
      filePaths.push(p);
    }
    // CSS Style
    if (files.style !== undefined) {
      const p = path.join(folderPath, `${auraName}.css`);
      await writeFile(p, files.style);
      filePaths.push(p);
    }

    // Every aura bundle needs a cmp or app meta xml
    const metaXml = buildMetadataXml('AuraDefinitionBundle', {
      apiVersion,
      description: `Aura Bundle ${auraName}`,
    });
    const metaPath = path.join(folderPath, `${auraName}.cmp-meta.xml`);
    await writeFile(metaPath, metaXml);
    filePaths.push(metaPath);

    const deployResult = await this.handleAutoDeploy(
      filePaths,
      `AuraDefinitionBundle:${auraName}`,
      autoDeploy,
      options.targetOrg
    );

    return { filePaths, deployResult };
  }

  /**
   * Creates a Visualforce Page.
   */
  public static async createVisualforcePage(
    pageName: string,
    content: string,
    options: { apiVersion?: string; label?: string; autoDeploy?: boolean; targetOrg?: string } = {}
  ): Promise<MetadataCreationResult> {
    const apiVersion = options.apiVersion || '60.0';
    const label = options.label || pageName;
    const autoDeploy = options.autoDeploy !== false;

    const pagePath = getMetadataPath('pages', `${pageName}.page`);
    const metaPath = getMetadataPath('pages', `${pageName}.page-meta.xml`);

    const metaXml = buildMetadataXml('ApexPage', {
      apiVersion,
      availableInTouch: 'true',
      confirmationTemplate: 'false',
      label,
    });

    await writeFile(pagePath, content);
    await writeFile(metaPath, metaXml);

    const filePaths = [pagePath, metaPath];
    const deployResult = await this.handleAutoDeploy(
      filePaths,
      `ApexPage:${pageName}`,
      autoDeploy,
      options.targetOrg
    );

    return { filePaths, deployResult };
  }

  /**
   * Creates a Custom Object (metadata folder name = objects/ObjectName/ObjectName.object-meta.xml)
   */
  public static async createCustomObject(
    objectName: string,
    label: string,
    pluralLabel: string,
    nameField: { type: 'Text' | 'AutoNumber'; label: string; nameFieldFormat?: string },
    options: { autoDeploy?: boolean; targetOrg?: string; description?: string } = {}
  ): Promise<MetadataCreationResult> {
    const autoDeploy = options.autoDeploy !== false;
    const cleanObjName = objectName.endsWith('__c') ? objectName : `${objectName}__c`;
    const folderPath = getMetadataPath('objects', cleanObjName);
    const metaPath = path.join(folderPath, `${cleanObjName}.object-meta.xml`);

    const nameFieldXml: Record<string, any> = {
      type: nameField.type,
      label: nameField.label,
    };

    if (nameField.type === 'AutoNumber' && nameField.nameFieldFormat) {
      nameFieldXml.displayFormat = nameField.nameFieldFormat;
    }

    const objectMeta = {
      deploymentStatus: 'Deployed',
      description: options.description || `Custom Object ${label}`,
      enableActivities: 'true',
      enableBulkApi: 'true',
      enableFeeds: 'false',
      enableHistory: 'true',
      enableLicensing: 'false',
      enableReports: 'true',
      enableSearch: 'true',
      enableSharing: 'true',
      enableStreamingApi: 'true',
      externalSharingModel: 'Private',
      label,
      nameField: nameFieldXml,
      pluralLabel,
      sharingModel: 'ReadWrite',
    };

    const xml = buildMetadataXml('CustomObject', objectMeta);
    await writeFile(metaPath, xml);

    const filePaths = [metaPath];
    const deployResult = await this.handleAutoDeploy(
      filePaths,
      `CustomObject:${cleanObjName}`,
      autoDeploy,
      options.targetOrg
    );

    return { filePaths, deployResult };
  }

  /**
   * Creates a Custom Field on an Object (objects/ObjectName/fields/FieldName.field-meta.xml)
   */
  public static async createCustomField(
    objectName: string,
    fieldName: string,
    fieldMetadata: Record<string, any>,
    options: { autoDeploy?: boolean; targetOrg?: string } = {}
  ): Promise<MetadataCreationResult> {
    const autoDeploy = options.autoDeploy !== false;
    const cleanObjName = objectName.endsWith('__c') ? objectName : `${objectName}__c`;
    const cleanFieldName = fieldName.endsWith('__c') ? fieldName : `${fieldName}__c`;
    
    const fieldPath = getMetadataPath('objects', cleanObjName, 'fields', `${cleanFieldName}.field-meta.xml`);

    const xml = buildMetadataXml('CustomField', fieldMetadata);
    await writeFile(fieldPath, xml);

    const filePaths = [fieldPath];
    // CustomField deployment is usually represented as CustomField:ObjectName.FieldName
    const deployResult = await this.handleAutoDeploy(
      filePaths,
      `CustomField:${cleanObjName}.${cleanFieldName}`,
      autoDeploy,
      options.targetOrg
    );

    return { filePaths, deployResult };
  }
}
