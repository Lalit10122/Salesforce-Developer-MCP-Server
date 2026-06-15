import { simpleGit, SimpleGit } from 'simple-git';
import { config } from '../config/index.js';
import { LoggerService } from './LoggerService.js';

export class GitService {
  private static gitInstance?: SimpleGit;

  private static getGit(): SimpleGit {
    if (!this.gitInstance) {
      this.gitInstance = simpleGit(config.projectPath);
    }
    return this.gitInstance;
  }

  /**
   * Retrieves current git status.
   */
  public static async status(): Promise<any> {
    try {
      LoggerService.debug('Fetching Git status');
      return await this.getGit().status();
    } catch (error: any) {
      LoggerService.error({ error }, 'Git status failed');
      throw new Error(`Git status failed: ${error.message}`);
    }
  }

  /**
   * Commits files with a message.
   */
  public static async commit(message: string, files: string[] = ['.']): Promise<any> {
    try {
      LoggerService.info({ message, files }, 'Executing Git commit');
      const git = this.getGit();
      
      // Stage files
      await git.add(files);
      
      // Commit files
      return await git.commit(message);
    } catch (error: any) {
      LoggerService.error({ error }, 'Git commit failed');
      throw new Error(`Git commit failed: ${error.message}`);
    }
  }

  /**
   * Pushes changes to remote.
   */
  public static async push(remote = 'origin', branch?: string): Promise<any> {
    try {
      LoggerService.info({ remote, branch }, 'Executing Git push');
      const git = this.getGit();
      const currentBranch = branch || (await git.branchLocal()).current;
      return await git.push(remote, currentBranch);
    } catch (error: any) {
      LoggerService.error({ error }, 'Git push failed');
      throw new Error(`Git push failed: ${error.message}`);
    }
  }

  /**
   * Pulls changes from remote.
   */
  public static async pull(remote = 'origin', branch?: string): Promise<any> {
    try {
      LoggerService.info({ remote, branch }, 'Executing Git pull');
      const git = this.getGit();
      const currentBranch = branch || (await git.branchLocal()).current;
      return await git.pull(remote, currentBranch);
    } catch (error: any) {
      LoggerService.error({ error }, 'Git pull failed');
      throw new Error(`Git pull failed: ${error.message}`);
    }
  }

  /**
   * Lists branches.
   */
  public static async branch(): Promise<any> {
    try {
      LoggerService.debug('Listing Git branches');
      return await this.getGit().branch();
    } catch (error: any) {
      LoggerService.error({ error }, 'Git branch failed');
      throw new Error(`Git branch listing failed: ${error.message}`);
    }
  }

  /**
   * Checkouts a branch.
   */
  public static async checkout(branchName: string, createNew = false): Promise<any> {
    try {
      LoggerService.info({ branchName, createNew }, 'Executing Git checkout');
      const git = this.getGit();
      if (createNew) {
        return await git.checkoutLocalBranch(branchName);
      }
      return await git.checkout(branchName);
    } catch (error: any) {
      LoggerService.error({ error }, 'Git checkout failed');
      throw new Error(`Git checkout failed: ${error.message}`);
    }
  }
}
