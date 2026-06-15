import { z } from 'zod';

// Regex for valid Salesforce Developer Names (no spaces, starts with letter, only alphanum and underscore, no consecutive underscores, no ending underscore)
export const DEV_NAME_REGEX = /^[a-zA-Z]([a-zA-Z0-9_]*[a-zA-Z0-9])?$/;

// Regex for valid Salesforce API Names (like DevName, Custom_Object__c, CustomField__c, etc.)
export const API_NAME_REGEX = /^[a-zA-Z]([a-zA-Z0-9_]*[a-zA-Z0-9])?(__c|__r|__mdt|__share|__latitude__s|__longitude__s|__pc|__pr)?$/;

export const sfDevNameSchema = z.string()
  .min(1, 'API Name cannot be empty')
  .regex(DEV_NAME_REGEX, 'Invalid Salesforce Developer Name. Must start with a letter, contain only alphanumeric characters and underscores, and not end with an underscore or have consecutive underscores.');

export const sfApiNameSchema = z.string()
  .min(1, 'API Name cannot be empty')
  .regex(API_NAME_REGEX, 'Invalid Salesforce API Name format.');
