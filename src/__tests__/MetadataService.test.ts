import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MetadataService } from '../services/MetadataService.js';
import * as fileUtils from '../utils/file.js';
import { DeploymentService } from '../services/DeploymentService.js';

vi.mock('../utils/file.js', () => ({
  getMetadataPath: vi.fn((folder, name) => `/force-app/main/default/${folder}/${name}`),
  writeFile: vi.fn(),
  deleteFile: vi.fn(),
  exists: vi.fn(),
}));

vi.mock('../services/DeploymentService.js', () => ({
  DeploymentService: {
    deploy: vi.fn().mockResolvedValue({ success: true, status: 'Succeeded' }),
  },
}));

describe('MetadataService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate Apex Class files and optionally deploy them', async () => {
    const className = 'TestClass';
    const content = 'public class TestClass {}';

    const result = await MetadataService.createApexClass(className, content, {
      autoDeploy: true,
      targetOrg: 'test-org',
    });

    expect(fileUtils.writeFile).toHaveBeenCalledTimes(2);
    expect(DeploymentService.deploy).toHaveBeenCalledWith({
      metadata: ['ApexClass:TestClass'],
      targetOrg: 'test-org',
    });
    expect(result.filePaths[0]).toContain('TestClass.cls');
  });

  it('should skip deployment if autoDeploy is false', async () => {
    const className = 'TestClass';
    const content = 'public class TestClass {}';

    await MetadataService.createApexClass(className, content, {
      autoDeploy: false,
    });

    expect(fileUtils.writeFile).toHaveBeenCalledTimes(2);
    expect(DeploymentService.deploy).not.toHaveBeenCalled();
  });
});
