import { describe, it, expect, vi } from 'vitest';
import { SalesforceCLIService } from '../services/SalesforceCLIService.js';
import { execa } from 'execa';

vi.mock('execa', () => ({
  execa: vi.fn(),
}));

describe('SalesforceCLIService', () => {
  it('should execute commands successfully and return output', async () => {
    vi.mocked(execa).mockResolvedValueOnce({
      stdout: 'Success Output',
      stderr: '',
    } as any);

    const result = await SalesforceCLIService.execute(['org', 'list']);
    expect(result.stdout).toBe('Success Output');
    expect(execa).toHaveBeenCalledWith('sf', ['org', 'list'], expect.any(Object));
  });

  it('should execute json commands successfully and return parsed result', async () => {
    vi.mocked(execa).mockResolvedValueOnce({
      stdout: JSON.stringify({ status: 0, result: { username: 'test-user' } }),
      stderr: '',
    } as any);

    const result = await SalesforceCLIService.executeJson<any>(['org', 'display']);
    expect(result.username).toBe('test-user');
    expect(execa).toHaveBeenCalledWith('sf', ['org', 'display', '--json'], expect.any(Object));
  });

  it('should throw CLIError when CLI execution fails', async () => {
    vi.mocked(execa).mockRejectedValueOnce(new Error('Command failed') as any);
    await expect(SalesforceCLIService.execute(['org', 'list'])).rejects.toThrow();
  });
});
