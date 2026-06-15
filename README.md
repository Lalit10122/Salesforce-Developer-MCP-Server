# Salesforce Developer MCP Server

A production-ready **Model Context Protocol (MCP) Server** built with Node.js + TypeScript. It enables AI assistants (Claude Desktop, Cursor, VS Code MCP clients, etc.) to perform end-to-end Salesforce development tasks—not just CRUD data operations.

This server interfaces directly with:
- **Salesforce CLI (`sf`)** for auth, deployments, retrieves, anonymous apex, testing, and logs.
- **Salesforce REST / Tooling API via JSForce** for database operations (SOQL/SOSL), CRUD, bulk loads, describing objects, query plans, and direct tooling metadata operations.
- **Git** for committing and pushing workspace source changes.

---

## Architecture & Design

1. **Authentication**: Reuses active Salesforce CLI logins. No need to store credentials. Set target org using `sf config set target-org` or pass `--target-org` parameters to tools.
2. **Metadata Generation**: Automatically generates metadata XML configurations (`-meta.xml`) for Apex classes, triggers, LWCs, custom objects, fields, permission sets, validation rules, global value sets, and compact layouts.
3. **Pino Logger**: Structured high-performance logging.
4. **Zod Validation**: Input validations on all tools.

---

## Directory Structure

```
salesforce-dev-mcp/
├── dist/                  # Compiled JS output
├── force-app/             # Local Salesforce DX workspace metadata files
│   └── main/default/
├── src/
│   ├── index.ts           # Entry point
│   ├── server.ts          # MCP Server definition and tool registration
│   ├── config/            # Environment configurations
│   ├── services/          # Business logic (Salesforce CLI, JSForce, Metadata, Git)
│   ├── utils/             # Errors, Pino logger, XML builders, file utils
│   └── tools/             # Zod input schemas and handlers grouped by type
├── sfdx-project.json      # Salesforce DX Project configuration
├── package.json           # Dependencies and build scripts
└── tsconfig.json          # TypeScript settings
```

---

## Configuration & Environment

Copy `.env.example` to `.env` and configure:

```env
SF_DEFAULT_ORG=me@myorg.com   # Default target org (optional)
PROJECT_PATH=.                # Path to Salesforce DX workspace (defaults to current directory)
LOG_LEVEL=info                # Pino logging level (trace, debug, info, warn, error)
PORT=3000                     # HTTP Port (if running SSE in future)
```

---

## Setup & Run

### 1. Install Dependencies
```bash
npm install
```

### 2. Login to Salesforce CLI
Ensure you have the `sf` CLI installed and are authenticated:
```bash
# Log in to a developer/sandbox org
sf org login web --alias dev-org
# Set it as default
sf config set target-org=dev-org
```

### 3. Build & Run
```bash
# Build TypeScript
npm run build

# Start MCP Server in production (stdio)
npm start

# Development mode (watch index.ts)
npm run dev
```

---

## Integrating with MCP Clients

### Claude Desktop Configuration
Add the following to your `claude_desktop_config.json` (usually at `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "salesforce-dev-mcp": {
      "command": "node",
      "args": ["E:/SF MCP Server/dist/index.js"],
      "env": {
        "SF_DEFAULT_ORG": "dev-org",
        "PROJECT_PATH": "E:/SF MCP Server"
      }
    }
  }
}
```

---

## MCP Tools Reference

### Org Tools
* `list_orgs`: List all authenticated orgs.
* `login_org`: Authorize a new org via web browser login.
* `set_default_org`: Set the default target org.
* `current_org`: Get details of the active org.

### Apex & Triggers
* `create_apex_class` / `update_apex_class` / `delete_apex_class`: Write/modify classes locally and deploy.
* `retrieve_apex_class`: Get Apex class content from local file or org.
* `explain_apex` / `optimize_apex`: Return code structure formatted for AI explanations and suggestions.
* `create_trigger` / `update_trigger` / `delete_trigger`: Manage Apex triggers on SObjects.

### LWC & Aura & Visualforce
* `create_lwc` / `update_lwc` / `delete_lwc`: Generate HTML, JS, CSS, and meta-xml configurations, and deploy them.
* `generate_apex_controller`: Scaffolds aura-enabled controller methods.
* `create_aura_component` / `create_aura_application` / `create_aura_event`: Manage Aura bundles.
* `create_vf_page` / `create_vf_component`: Manage Visualforce pages and components.

### Metadata & Objects
* `create_custom_object`: Scaffold a new custom object (`__c`) and metadata.
* `create_custom_field`: Supports Text, Number, Picklist, Lookup, MasterDetail, and more.
* `create_record_type` / `create_validation_rule` / `create_global_value_set`: Construct and deploy structural metadata.
* `create_custom_metadata_type`: Scaffolds public metadata types (`__mdt`).
* `create_custom_tab` / `create_compact_layout` / `create_page_layout`: Layout configurations.

### Flow & Permissions
* `create_flow`: Supports Screen Flow, AutoLaunched Flow, and templates for Record-Triggered Flows. Also supports passing raw XML.
* `create_permission_set`: Specify Apex classes, Object CRUD permissions, and Field read/write permissions.

### Data (REST/Tooling/Bulk)
* `execute_soql` / `execute_sosl`: Run database queries.
* `describe_object`: Get layout/field metadata.
* `query_plan`: Analyze query performance indexes.
* `create_record` / `update_record` / `delete_record` / `get_record`: Standard CRUD.
* `bulk_insert` / `bulk_update` / `bulk_delete`: Handle large-volume data operations.

### Tests, Debug, & Anonymous Apex
* `execute_anonymous`: Run anonymous code block execution.
* `run_all_tests` / `run_class_tests` / `run_method_tests`: Execute unit tests with code coverage report.
* `list_debug_logs` / `get_debug_log`: Fetch debug log bodies.
* `list_trace_flags` / `create_trace_flag` / `delete_trace_flag`: Set logging monitoring levels.

### Git Version Control
* `git_status` / `git_commit` / `git_push` / `git_pull` / `git_checkout`: Control workspace changes.

---

## Example Prompts for AI Assistant

- **Create Apex class**: *"Create an Apex class named InvoiceService with a method to calculate tax on line items."*
- **Create LWC**: *"Create an LWC called invoiceDashboard displaying a list of invoice records in a table."*
- **Database queries**: *"Execute SOQL query: SELECT Name, Amount__c FROM Invoice__c WHERE Status__c = 'Pending' LIMIT 10"*
- **Create SObject**: *"Create a custom object named Expense__c with custom currency field Amount__c."*
- **Test execution**: *"Run all tests in the org and show code coverage."*
- **Anonymous block**: *"Execute anonymous Apex: System.debug('Org limit queries: ' + Limits.getQueries());"*
