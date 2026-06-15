export class BaseError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class CLIError extends BaseError {
  constructor(message: string, public stderr?: string, code?: string) {
    super(message, code);
  }
}

export class DeploymentError extends BaseError {
  constructor(message: string, public details?: any, code?: string) {
    super(message, code);
  }
}

export class MetadataError extends BaseError {
  constructor(message: string, code?: string) {
    super(message, code);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, public errors?: any, code?: string) {
    super(message, code);
  }
}

export class SalesforceAPIError extends BaseError {
  constructor(message: string, public statusCode?: number, public originalError?: any) {
    super(message);
    this.name = 'SalesforceAPIError';
  }
}
