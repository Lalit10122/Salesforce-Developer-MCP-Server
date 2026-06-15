import { McpServer } from '../../server.js';
import { z } from 'zod';
import { SalesforceCLIService } from '../../services/SalesforceCLIService.js';

export function registerTestTools(server: McpServer): void {
  // Helper to execute sf apex run test
  const executeTests = async (options: {
    testLevel: 'RunLocalTests' | 'RunAllTestsInOrg' | 'RunSpecifiedTests';
    tests?: string[];
    targetOrg?: string;
  }) => {
    const args = [
      'apex', 'run', 'test',
      '--test-level', options.testLevel,
      '--code-coverage',
      '--json',
      '--wait', '10'
    ];

    if (options.tests && options.tests.length > 0) {
      args.push('--tests', options.tests.join(','));
    }
    if (options.targetOrg) {
      args.push('--target-org', options.targetOrg);
    }

    const result = await SalesforceCLIService.executeJson<any>(args);
    return result;
  };

  // run_all_tests
  server.tool(
    'run_all_tests',
    'Run all local Apex tests and return results, failures, and code coverage',
    {
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const result = await executeTests({
          testLevel: 'RunLocalTests',
          targetOrg: params.targetOrg,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Test run failed: ${error.message}\n${error.stderr || ''}` }],
        };
      }
    }
  );

  // run_class_tests
  server.tool(
    'run_class_tests',
    'Run test classes in the org',
    {
      classes: z.array(z.string()).describe('List of Test Class names to run'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const result = await executeTests({
          testLevel: 'RunSpecifiedTests',
          tests: params.classes,
          targetOrg: params.targetOrg,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Test run failed: ${error.message}\n${error.stderr || ''}` }],
        };
      }
    }
  );

  // run_method_tests
  server.tool(
    'run_method_tests',
    'Run specific Apex test methods (ClassName.methodName)',
    {
      methods: z.array(z.string()).describe('List of test methods to run in format ClassName.methodName'),
      targetOrg: z.string().optional().describe('Username or alias of target org'),
    },
    async (params) => {
      try {
        const result = await executeTests({
          testLevel: 'RunSpecifiedTests',
          tests: params.methods,
          targetOrg: params.targetOrg,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Test run failed: ${error.message}\n${error.stderr || ''}` }],
        };
      }
    }
  );
}
