# Salesforce Developer MCP Server — Future Update Roadmap

This document outlines the proposed roadmap and future functionalities to expand the capabilities of the Salesforce Developer MCP Server.

---

## 1. DevOps & Scratch Org Automation
*   **Scratch Org Lifecycle**: Add tools to create, delete, and list Scratch Orgs (`sf org create scratch`, `sf org delete scratch`).
*   **Source Tracking**: Integrate source tracking tools (`sf project deploy preview`) to preview sync diffs and manage conflicts.
*   **2GP Packaging**: Support creating, versioning, and deploying Second Generation Unlocked and Managed Packages (`sf package version create`).

---

## 2. Code Quality & Security Scanning
*   **Apex PMD Code Analyzer**: Run Salesforce Code Analyzer (`sf scanner run`) to catch security issues (e.g. SOQL injections, sharing bypasses) and design flaws before deployment.
*   **LWC Jest Test Runner**: Support creating and running local JS unit tests (`npm run test:unit`) for LWCs.

---

## 3. Data Cloud, AI, & Agentforce
*   **Prompt Builder & Agentforce**: Expose metadata tools to create Prompt Templates and register Agentforce actions.
*   **Data Cloud Schemas**: Add support to describe and construct Data Lake Objects (DLOs) and Data Model Objects (DMOs).
*   **Einstein Generative APIs**: Interface with Einstein endpoints to summarize records or generate metadata translations.

---

## 4. Developer Productivity
*   **Org Diff / Compare**: Fetch and display diff comparisons between Sandbox and Production metadata configurations.
*   **Smart Mock Data Seeding**: Automatically generate and import realistic mock data sets (e.g. Accounts, Contacts) into developer orgs.
*   **Replay Debugger Support**: Parse debug logs into standard debug execution paths to step through runtime errors.
