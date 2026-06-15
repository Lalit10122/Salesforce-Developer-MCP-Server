import { McpServer } from '../../server.js';
import { z } from 'zod';
import { GitService } from '../../services/GitService.js';

export function registerGitTools(server: McpServer): void {
  // status
  server.tool(
    'git_status',
    'Get local git workspace status (untracked, modified, deleted, and staged files)',
    {},
    async () => {
      try {
        const status = await GitService.status();
        return {
          content: [{ type: 'text', text: JSON.stringify(status, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Git status failed: ${error.message}` }],
        };
      }
    }
  );

  // commit
  server.tool(
    'git_commit',
    'Stage files and commit them with a message',
    {
      message: z.string().describe('Commit message'),
      files: z.array(z.string()).optional().default(['.']).describe('Specific files to commit (defaults to staging all changes)'),
    },
    async (params) => {
      try {
        const result = await GitService.commit(params.message, params.files);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Git commit failed: ${error.message}` }],
        };
      }
    }
  );

  // push
  server.tool(
    'git_push',
    'Push local commits to remote git repository',
    {
      remote: z.string().optional().default('origin').describe('Remote name (default origin)'),
      branch: z.string().optional().describe('Branch name (defaults to current branch)'),
    },
    async (params) => {
      try {
        const result = await GitService.push(params.remote, params.branch);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Git push failed: ${error.message}` }],
        };
      }
    }
  );

  // pull
  server.tool(
    'git_pull',
    'Pull changes from remote git repository',
    {
      remote: z.string().optional().default('origin').describe('Remote name'),
      branch: z.string().optional().describe('Branch name'),
    },
    async (params) => {
      try {
        const result = await GitService.pull(params.remote, params.branch);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Git pull failed: ${error.message}` }],
        };
      }
    }
  );

  // branch
  server.tool(
    'git_branch',
    'List, create, or delete branches in git',
    {},
    async () => {
      try {
        const result = await GitService.branch();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Git branch query failed: ${error.message}` }],
        };
      }
    }
  );

  // checkout
  server.tool(
    'git_checkout',
    'Switch branch or create a new branch',
    {
      branch: z.string().describe('Name of the branch to switch to'),
      create: z.boolean().optional().default(false).describe('Whether to create a new branch (-b)'),
    },
    async (params) => {
      try {
        const result = await GitService.checkout(params.branch, params.create);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Git checkout failed: ${error.message}` }],
        };
      }
    }
  );
}
