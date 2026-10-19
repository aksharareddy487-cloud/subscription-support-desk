# AI Chatbot & Version-Aware RAG Engine (Module #5)
**Project 18:** Subscription Product Support Desk  
**Assigned Lead:** Hansika Iruventi (#5)  
**Branch:** `hansika-ai-rag`  

---

## 🚀 Overview & Architecture

This module implements the complete artificial intelligence layer for the Subscription Product Support Desk, fulfilling all capstone requirements:
1. **Version-Aware Help Document Retrieval (RAG):** Evaluates the customer's active product version (`v1.8` vs `v2.4`) and filters retrieved articles accordingly, appending verified citations (`[Doc: ...]`).
2. **Purposeful Agent Workflow:** Handles diagnostic requests such as *"Why can't my team export this report?"* through authorized sequential tool execution:
   - `readEntitlements`: Reads session-bound plan tier and permissions.
   - `readServiceStatus`: Checks active incidents on affected subsystems.
   - `searchHelp`: Finds version-specific troubleshooting documentation.
3. **Strict Multi-Tenant Isolation & Security Guardrails:**
   - Active customer scope is derived **strictly from the server-side authenticated session**, completely neutralizing prompt injection attempts to inspect other organizations' data.
   - Guardrails prevent hallucinated refunds, plan upgrades, or false claims of incident resolution.
   - Tool timeouts or failures are audited as `incomplete` checks rather than false positive diagnoses.
4. **Audit Logging:** Every tool call is logged to the `ToolRun` MongoDB collection with duration, input parameters, and output results.

---

## 📁 Files Created & Modified by Hansika

| File Path | Description |
| :--- | :--- |
| `models/HelpArticle.js` | Schema for version-aware articles with category, status, and vector embedding arrays. |
| `models/Incident.js` | Schema for simulated and live service outages on features. |
| `models/ToolRun.js` | Schema auditing agent tool runs, status (`success`, `incomplete`, `failed`), and execution duration. |
| `models/Conversation.js` | Schema tracking customer/assistant chat history, attached citations, and tool run traces. |
| `services/embeddingService.js` | Embedding generator supporting local Ollama (`nomic-embed-text`) with a resilient normalized vector fallback. |
| `services/vectorService.js` | Version-aware vector search engine utilizing MongoDB Atlas `$vectorSearch` and cosine ranking. |
| `tools/agentTools.js` | The 3 LangChain structured tools: `readEntitlements`, `readServiceStatus`, and `searchHelp`. |
| `services/supportAgent.js` | LangChain purposeful agent orchestrator with system prompt guardrails and deterministic fallback. |
| `controllers/support.controller.js` | Express controllers for `/api/support-agent`, `/api/support-chat`, `/api/help`, and `/api/status`. |
| `routes/support.routes.js` | Express route definitions wired with `requireAuth` and `requireOrgMembership`. |
| `scripts/seed-ai.js` | Populates versioned articles (v1.8 and v2.4) and the simulated report export incident (`INC-2041`). |
| `client-support/InvestigationChat.jsx` | Full React chat widget with live citation pills and investigative tool trace badges. |
| `client-support/CitationBadge.jsx` | Reusable UI badge displaying grounded document citations. |
| `test-ai-agent.js` | Automated acceptance evaluation script verifying the dual-user demonstration scenario and guardrails. |

---

## 📡 API Endpoints

### 1. `POST /api/support-agent` (Protected)
Executes the multi-tool diagnostic investigation.
* **Headers:** `Content-Type: application/json`, Cookie: `support_desk.sid`
* **Request Body:**
  ```json
  {
    "message": "Why can't my team export this report?",
    "conversationId": "optional-mongo-id"
  }
  ```
* **Response Body:**
  ```json
  {
    "success": true,
    "conversationId": "6714a...",
    "reply": "Your ENTERPRISE account is fully entitled to export reports; however, our monitoring indicates an active service incident...",
    "citations": [
      {
        "docTitle": "Scheduled & On-Demand Report Export Guide",
        "version": "v2.4",
        "citationTag": "[Doc: Scheduled & On-Demand Report Export Guide (v2.4)]"
      }
    ],
    "toolSteps": [
      { "toolName": "readEntitlements", "status": "success", "summary": "Verified plan 'enterprise' entitlements for 'export'." },
      { "toolName": "readServiceStatus", "status": "success", "summary": "Detected active incident INC-2041 on 'export'." }
    ],
    "escalationRecommended": true,
    "incidentCode": "INC-2041"
  }
  ```

### 2. `POST /api/support-chat` (Protected)
Quick grounded Q&A against versioned documentation with citations.

### 3. `GET /api/help` (Public)
Returns published help articles with optional query filtering (`?version=v2.4&category=export_reports`).

### 4. `GET /api/status` (Public)
Returns sanitized active service incidents.

---

## 🧪 Testing & Live Demonstration

### 1. Seed Accounts & Knowledge Base
Ensure local MongoDB is running, then run:
```bash
npm run seed     # Seeds users & organizations (Preetham)
npm run seed:ai  # Seeds versioned articles & simulated incident (Hansika)
```

### 2. Run Acceptance Test Suite
Execute the automated evaluation suite:
```bash
npm run test:ai
```
This automatically validates:
- **Scenario A (Bob - Starter Plan):** Verifies that `readEntitlements` detects the missing export entitlement and cites `[Doc: Plan Entitlements and Report Export Limits (v1.8)]`.
- **Scenario B (Alice - Enterprise Plan):** Verifies that `readServiceStatus` detects active incident `INC-2041` and drafts an escalation.
- **Scenario C (Guardrail Refusal):** Verifies that refund and financial concession requests are strictly declined.
