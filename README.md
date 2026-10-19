# Subscription Product Support Desk (Project 18)

AI-powered full-stack support portal for a fictional SaaS subscription product where customers can troubleshoot setup, account limits, and service incidents with grounded AI answers or escalate to human specialists.

Built with **ReactJS, Node.js, Express, Mongoose, MongoDB Atlas, Ollama, LangChain, and Zod**.

---

## ⚡ Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Seed demo organizations and accounts for all roles
npm run seed

# 3. Start the backend server (runs on http://localhost:5000)
npm start
```

---

## 🔑 Seeded Demo Accounts (Immediate Testing)

| Persona / Role | Email | Password | Organization | Note / Test Scenario |
| :--- | :--- | :--- | :--- | :--- |
| **Customer (Enterprise)** | `alice@acme.com` | `Password123!` | Acme Cloud Corp | `productVersion: 'v2.4'`, can export reports |
| **Customer (Starter)** | `bob@piedpiper.com` | `Password123!` | Pied Piper Tech | `productVersion: 'v1.8'`, **cannot** export reports (Hits plan limit) |
| **Support Specialist** | `specialist@supportdesk.internal` | `Specialist123!` | Internal Staff | Views assigned tickets, submits resolutions |
| **Knowledge Manager** | `knowledge@supportdesk.internal` | `Knowledge123!` | Internal Staff | Publishes help articles & version drafts |
| **Supervisor** | `supervisor@supportdesk.internal` | `Supervisor123!` | Internal Staff | Assigns tickets, audits sensitive actions |

---

## 🏗️ Architecture & Authentication Core (Preetham Kanvapuri - #2)

The authentication system is built and running:
* **Server-side Sessions**: Backed by MongoDB (`connect-mongo`) with expiring `httpOnly` cookies (`support_desk.sid`).
* **CSRF Protection**: Double-submit cookie with `X-CSRF-Token` header validation on mutating requests.
* **Brute-Force Rate Limiting**: Throttles failed logins to 5 attempts per 15 minutes.
* **Hardened RBAC**: Only `customer` can be registered via signup. Staff accounts cannot be self-assigned.
* **Tenant Isolation**: Customers are strictly partitioned by `organizationId`.
* **AI Safety**: `extractCustomerScope(req)` derives tenant info (`orgId`, `productVersion`) from server sessions; `sanitizeForModelContext()` strips secrets.

---

# 👥 Teammate Integration & Implementation Guides

Below are the dedicated folders, files, and exact code snippets each team member should use from Preetham's Auth system to complete their part of the project.

---

### 📁 Member 1: Dodda Ashwith — Main Frontend Setup, Navigation & Integration
* **Assigned Work**: App layout, global navigation bar, page routing, and frontend integration.
* **Folder Location**: `client/` or `src/`
* **Files provided by Preetham in `/client-auth`**:
  * `client-auth/AuthContext.jsx`: Global authentication provider and `useAuth()` hook.
  * `client-auth/ProtectedRoute.jsx`: React Router v6 route guard enforcing authentication and roles.
  * `client-auth/apiClient.js`: Fetch wrapper with automatic session cookies (`credentials: 'include'`) and CSRF tokens.
  * `client-auth/LoginForm.jsx` & `client-auth/SignupForm.jsx`: Pre-built authentication forms.

#### How to integrate in your `App.jsx` / `Router.jsx`:
```jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './client-auth/AuthContext';
import { ProtectedRoute } from './client-auth/ProtectedRoute';
import { LoginForm } from './client-auth/LoginForm';
import { SignupForm } from './client-auth/SignupForm';

export default function App() {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginForm />} />
        <Route path="/signup" element={<SignupForm />} />
        <Route path="/help" element={<HelpCenter />} />

        {/* Customer Only Routes */}
        <Route path="/tickets" element={
          <ProtectedRoute allowedRoles={['customer']}>
            <CustomerTicketTimeline />
          </ProtectedRoute>
        } />

        {/* Staff Only Routes */}
        <Route path="/specialist/queue" element={
          <ProtectedRoute allowedRoles={['support_specialist', 'supervisor']}>
            <SpecialistQueue />
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  );
}
```

---

### 📁 Member 3: Dhruva Krishna Polepaka — Ticket Backend APIs & Management
* **Assigned Work**: Ticket creation, customer ticket timeline, specialist resolution, and escalation APIs.
* **Recommended Folder**: `routes/ticket.routes.js` and `controllers/ticket.controller.js`
* **What you get from Preetham**:
  * `requireAuth`: Ensures user is logged in and attaches `req.user`.
  * `requireOrgMembership`: Enforces that customers cannot access other companies' tickets.
  * `requireRole(['support_specialist', 'supervisor'])`: Restricts staff endpoints.
  * `logSensitiveAction('ACTION_NAME')`: Audits supervisor/specialist modifications in `AuditLog`.

#### Example Route Setup (`routes/ticket.routes.js`):
```javascript
import express from 'express';
import {
  requireAuth,
  requireRole,
  requireOrgMembership,
  logSensitiveAction
} from '../middleware/auth.middleware.js';

const router = express.Router();

// 1. Customer creates a ticket (Tenant isolated)
router.post('/api/tickets', requireAuth, requireOrgMembership, async (req, res) => {
  // Derives customerId and organizationId directly from session!
  const ticket = await Ticket.create({
    customerId: req.user._id,
    organizationId: req.user.organizationId,
    title: req.body.title,
    description: req.body.description,
    status: 'open',
  });
  res.status(201).json(ticket);
});

// 2. Customer views ticket (Checked against organization membership)
router.get('/api/tickets/:id', requireAuth, requireOrgMembership, getTicketById);

// 3. Specialist proposes resolution (Audited)
router.post(
  '/api/tickets/:id/resolution',
  requireAuth,
  requireRole(['support_specialist', 'supervisor']),
  logSensitiveAction('RESOLVE_TICKET'),
  resolveTicket
);

// 4. Specialist escalates incident
router.post(
  '/api/tickets/:id/escalation',
  requireAuth,
  requireRole(['support_specialist', 'supervisor']),
  logSensitiveAction('ESCALATE_TICKET'),
  escalateTicket
);

// 5. Supervisor assigns ticket to a specialist
router.post(
  '/api/tickets/:id/assignment',
  requireAuth,
  requireRole(['supervisor']),
  logSensitiveAction('ASSIGN_TICKET'),
  assignTicket
);

export default router;
```

---

### 📁 Member 4: Seelam Monish Reddy — MongoDB Database & Data Models
* **Assigned Work**: MongoDB Atlas schemas, relations, and data models.
* **Folder Location**: `models/`
* **Models created by Preetham**:
  * `models/User.js`: User schema (`name`, `email`, `passwordHash`, `role`, `organizationId`, `isEmailVerified`).
  * `models/Organization.js`: Organization schema (`name`, `domain`, `plan`, `productVersion`, `entitlements`, `isVerified`).
  * `models/AuditLog.js`: Audit log schema for sensitive staff checks.
* **Foreign Key References for your models**:
  * In your `Ticket` model (`models/Ticket.js`):
    ```javascript
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Specialist
    ```
  * In your `Incident` model (`models/Incident.js`):
    ```javascript
    affectedPlanTiers: [{ type: String, enum: ['starter', 'pro', 'enterprise'] }],
    affectedVersions: [{ type: String }],
    ```

---

### 📁 Member 5: Hansika Iruventi — AI Chatbot & Help-Document Retrieval (RAG)
* **Assigned Work**: Ollama / LangChain JS AI support chat agent, vector similarity search, citations, and version filtering.
* **Recommended Folder**: `routes/ai.routes.js` and `services/rag.service.js`
* **What you get from Preetham**:
  * `extractCustomerScope(req)` from `middleware/auth.middleware.js`: Gives you `userId`, `organizationId`, `plan`, and `productVersion`.
  * `sanitizeForModelContext(data)` from `utils/sanitize.js`: Cleanses data so passwords/tokens never leak into LLM prompts.
  * **CRITICAL RULE**: Product version and organization **must come from the server session, NEVER from `req.body`**.

#### Example Route Setup (`routes/ai.routes.js`):
```javascript
import express from 'express';
import { requireAuth, extractCustomerScope } from '../middleware/auth.middleware.js';
import { sanitizeForModelContext } from '../utils/sanitize.js';

const router = express.Router();

router.post('/api/support-agent', requireAuth, async (req, res) => {
  // 1. Extract verified server-side customer scope
  const scope = extractCustomerScope(req);
  /* scope = {
       userId: "...",
       userName: "Alice Acme",
       role: "customer",
       organizationId: "...",
       organizationName: "Acme Cloud Corp",
       plan: "enterprise",
       productVersion: "v2.4", // <-- Exact version to filter Vector Search
       entitlements: { canExportReports: true, ... }
     }
  */

  // 2. Perform Version-Aware Vector Retrieval
  // Only retrieve articles matching customer's product version:
  const docs = await vectorStore.similaritySearch(req.body.message, 3, {
    version: scope.productVersion,
  });

  // 3. Run LangChain Agent with tool capabilities
  const agentResponse = await runSupportAgent({
    userQuery: req.body.message,
    retrievedDocs: docs,
    scope: scope, // Tools use scope.organizationId, avoiding cross-customer queries
  });

  // 4. Sanitize and return answer with citations
  res.json({
    reply: sanitizeForModelContext(agentResponse.answer),
    citations: agentResponse.citations,
    toolRuns: agentResponse.toolRuns,
  });
});

export default router;
```

---

### 📁 Member 6: P Netra — Service Status, Incident Data & AI Troubleshooting Tools
* **Assigned Work**: Service status endpoint, incident dataset, and authorized LangChain troubleshooting tools.
* **Recommended Folder**: `tools/troubleshoot.tools.js` and `routes/status.routes.js`
* **What you get from Preetham**:
  * Public Route: `GET /api/status` is public (sanitized updates, no auth required).
  * AI Tool Isolation: The AI tools must derive customer organization strictly from the authenticated session.

#### Example Tool Implementation (`tools/troubleshoot.tools.js`):
```javascript
import { Organization } from '../models/Organization.js';
import { Incident } from '../models/Incident.js';

// Tool 1: Read Entitlements (Derived from session scope, never client input)
export const readEntitlementsTool = async (scope) => {
  const org = await Organization.findById(scope.organizationId);
  return {
    plan: org.plan,
    productVersion: org.productVersion,
    canExportReports: org.entitlements.canExportReports,
  };
};

// Tool 2: Read Service Status
export const readServiceStatusTool = async (featureName) => {
  const incident = await Incident.findOne({ feature: featureName, status: 'investigating' });
  return incident ? { hasOutage: true, description: incident.publicSummary } : { hasOutage: false };
};
```

---

### 📁 Member 7: Meghana Nama — Knowledge Management (Help Articles & Publishing)
* **Assigned Work**: Help versioning, article draft creation, and publishing workflow.
* **Recommended Folder**: `routes/knowledge.routes.js` and `controllers/knowledge.controller.js`
* **What you get from Preetham**:
  * Public browsing: `GET /api/help` is accessible without authentication.
  * Restricted Drafts & Publishing: Protected by `requireRole(['knowledge_manager', 'supervisor'])`.

#### Example Route Setup (`routes/knowledge.routes.js`):
```javascript
import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public: Browse published articles
router.get('/api/help', getPublishedHelpArticles);

// Protected: Only Knowledge Managers or Supervisors can create drafts or publish
router.post(
  '/api/help-drafts',
  requireAuth,
  requireRole(['knowledge_manager', 'supervisor']),
  createHelpDraft
);

router.post(
  '/api/help-drafts/:id/publish',
  requireAuth,
  requireRole(['knowledge_manager', 'supervisor']),
  publishHelpVersion
);

export default router;
```

---

### 📁 Member 8: V Samhita Reddy — Support Staff Dashboard & Ticket Assignment
* **Assigned Work**: Specialist queue view, ticket resolution modal, supervisor assignment interface.
* **Recommended Folder**: `client/src/pages/SpecialistDashboard.jsx` and `routes/staff.routes.js`
* **What you get from Preetham**:
  * Staff route guard: `<ProtectedRoute allowedRoles={['support_specialist', 'supervisor']}>`.
  * Pre-seeded staff logins:
    * Specialist: `specialist@supportdesk.internal` / `Specialist123!`
    * Supervisor: `supervisor@supportdesk.internal` / `Supervisor123!`

---

### 📁 Member 9: K Akshara Reddy — Help Center Frontend
* **Assigned Work**: Public Help Center screen, search bar, article reader, and customer escalation button.
* **Recommended Folder**: `client/src/pages/HelpCenter.jsx`
* **What you get from Preetham**:
  * Use `const { user, isAuthenticated } = useAuth();` from `client-auth/AuthContext`.
  * If `isAuthenticated`, show personalized badge: `"Logged in as: {user.name} ({user.organizationId.name})"` and direct link to customer investigation chat.
  * If guest, show public help with a *"Sign in for personalized product support"* callout.

---

### 📁 Member 10: B Siri Chandana — Testing, Security Checks & Deployment
* **Assigned Work**: Security testing, tenant isolation checks, test suites, and deployment preparation.
* **What you get from Preetham**:
  * Unit test script: Run `node test-auth.js` (crypto, bcrypt, and data sanitization checks).
  * 5 Core Security Verification Test Cases for your submission report:
    1. **Brute Force Rate Limiting**: 6 rapid POST requests to `/api/auth/login` triggers `429 Too Many Requests`.
    2. **Staff Role Escalation Prevention**: Sending `POST /api/auth/signup` with `{"role": "supervisor"}` must force `role: 'customer'`.
    3. **CSRF Enforcement**: Mutating requests (`POST`, `PATCH`, `DELETE`) without `X-CSRF-Token` return `403 CSRF_VALIDATION_FAILED`.
    4. **Session Cookie Hardening**: Verify `support_desk.sid` has `HttpOnly: true` and `SameSite: Lax/Strict`.
    5. **Cross-Tenant Isolation**: Ensure a customer in Org A cannot view tickets belonging to Org B (`403 ORG_ACCESS_DENIED`).
