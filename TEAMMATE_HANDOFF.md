# Subscription Product Support Desk (Project 18)
## Authentication & RBAC Handoff Guide — Preetham Kanvapuri (#2)

This document provides each team member with exact code snippets, API endpoints, data models, and middleware to integrate authentication, sessions, and role permissions into their respective modules.

---

## 🔑 Quick Reference: Seeded Demo Accounts
Run `npm run seed` to populate the database with these accounts:

| Persona | Role | Email | Password | Organization | Entitlements |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Customer (Enterprise)** | `customer` | `alice@acme.com` | `Password123!` | Acme Cloud Corp | Can export reports, priority support |
| **Customer (Starter)** | `customer` | `bob@piedpiper.com` | `Password123!` | Pied Piper Tech | **Cannot** export reports (Plan limit demo) |
| **Support Specialist** | `support_specialist` | `specialist@supportdesk.internal` | `Specialist123!` | Internal Staff | Views assigned tickets, submits resolutions |
| **Knowledge Manager** | `knowledge_manager` | `knowledge@supportdesk.internal` | `Knowledge123!` | Internal Staff | Publishes help articles & versions |
| **Supervisor** | `supervisor` | `supervisor@supportdesk.internal` | `Supervisor123!` | Internal Staff | Assigns tickets, approves restricted actions |

---

## 📡 Base Auth Endpoints (Port 5000)

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/auth/csrf-token` | Public | Obtains CSRF token for mutating requests |
| `POST` | `/api/auth/signup` | Public | Registers a new customer with verified organization |
| `POST` | `/api/auth/login` | Public (Rate-limited) | Validates credentials, regenerates session, sets cookie |
| `POST` | `/api/auth/logout` | Authenticated | Destroys session and clears cookies |
| `GET` | `/api/auth/me` | Authenticated | Returns current user profile and organization info |
| `GET` | `/api/auth/verify-email?token=...` | Public | Verifies customer email address |
| `POST` | `/api/auth/forgot-password` | Public (Rate-limited) | Dispatches time-limited password reset token |
| `POST` | `/api/auth/reset-password` | Public (Rate-limited) | Resets password with valid token |

---

## 👥 Teammate-by-Teammate Integration Guide

### 1. Dodda Ashwith (#1 - Main Frontend Setup & Navigation)
* **Files provided for you in `/client-auth`**:
  * `apiClient.js`: Preconfigured client with `credentials: 'include'` and automatic CSRF handling.
  * `AuthContext.jsx`: Provides `user`, `login`, `signup`, `logout`, `isAuthenticated`, `isCustomer`, `isSpecialist`, `isSupervisor`.
  * `ProtectedRoute.jsx`: Guards routes based on authentication and roles.
  * `LoginForm.jsx` & `SignupForm.jsx`: Pre-built auth UI components.
* **How to integrate in `App.jsx`**:
```jsx
import { AuthProvider } from './client-auth/AuthContext';
import { ProtectedRoute } from './client-auth/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginForm />} />
        <Route path="/signup" element={<SignupForm />} />
        <Route path="/help" element={<HelpCenter />} />

        {/* Customer Protected Route */}
        <Route path="/tickets" element={
          <ProtectedRoute allowedRoles={['customer']}>
            <CustomerTicketTimeline />
          </ProtectedRoute>
        } />

        {/* Support Staff Protected Route */}
        <Route path="/specialist-queue" element={
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

### 2. Dhruva Krishna Polepaka (#3 - Ticket Backend APIs)
* **Import Preetham's Middlewares**:
```javascript
import {
  requireAuth,
  requireRole,
  requireOrgMembership,
  logSensitiveAction
} from '../middleware/auth.middleware.js';
```
* **Protecting your ticket routes (`ticket.routes.js`)**:
```javascript
// Customer can create ticket (bound to their session org)
router.post('/api/tickets', requireAuth, requireOrgMembership, async (req, res) => {
  const newTicket = await Ticket.create({
    customerId: req.user._id,
    organizationId: req.user.organizationId, // Derived from session!
    title: req.body.title,
    description: req.body.description,
  });
  res.status(201).json(newTicket);
});

// Specialist updates ticket resolution (audited)
router.post(
  '/api/tickets/:id/resolution',
  requireAuth,
  requireRole(['support_specialist', 'supervisor']),
  logSensitiveAction('RESOLVE_TICKET'),
  ticketController.resolveTicket
);

// Supervisor assigns ticket (audited)
router.post(
  '/api/tickets/:id/assignment',
  requireAuth,
  requireRole(['supervisor']),
  logSensitiveAction('ASSIGN_TICKET'),
  ticketController.assignTicket
);
```

---

### 3. Seelam Monish Reddy (#4 - MongoDB Database & Data Models)
* **Models created by Preetham**:
  * `models/User.js`: Contains `name`, `email`, `passwordHash`, `role`, `organizationId`, `isEmailVerified`.
  * `models/Organization.js`: Contains `name`, `domain`, `plan`, `entitlements`, `isVerified`.
  * `models/AuditLog.js`: Contains audit records for sensitive supervisor and specialist actions.
* **Foreign Key References for your models**:
  * In your `Ticket` model, reference:
    * `customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }`
    * `assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }`
    * `organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' }`
  * Sessions are automatically managed by `connect-mongo` in the `sessions` collection.

---

### 4. Hansika Iruventi (#5 - AI Chatbot & RAG Retrieval)
* **Requirement from Project Brief**:
  > *"Tools derive the active customer scope from the authenticated session. Passwords, tokens and payment details must never be included in model context or support logs."*
* **How to derive safe customer scope in `/api/support-chat` or `/api/support-agent`**:
```javascript
import { requireAuth, extractCustomerScope } from '../middleware/auth.middleware.js';
import { sanitizeForModelContext } from '../utils/sanitize.js';

router.post('/api/support-agent', requireAuth, async (req, res) => {
  // Extract verified scope from authenticated session
  const customerScope = extractCustomerScope(req);
  /* customerScope = {
       userId: "...",
       userName: "Alice Acme",
       role: "customer",
       organizationId: "...",
       plan: "enterprise",
       entitlements: { canExportReports: true, ... }
     }
  */

  // Pass customerScope into LangChain Agent / Tools
  const response = await runSupportAgent({
    userPrompt: req.body.message,
    scope: customerScope, // Prevents prompt injection trying to impersonate another org!
  });

  // Ensure output is sanitized
  res.json({ reply: sanitizeForModelContext(response) });
});
```

---

### 5. P Netra (#6 - Service Status, Incidents & AI Troubleshooting Tools)
* **Requirement**: Public sanitized incident route & tool-level org isolation.
* **Public Route**:
  * `GET /api/status`: Do NOT use `requireAuth` here. Return sanitized incident updates.
* **LangChain Tool Implementation (e.g. `readEntitlements`)**:
```javascript
// Inside your troubleshooting tool definition
const readEntitlementsTool = async (scope) => {
  // Use scope.organizationId from session - DO NOT trust user-supplied orgId in prompt!
  const org = await Organization.findById(scope.organizationId);
  return {
    plan: org.plan,
    canExportReports: org.entitlements.canExportReports,
  };
};
```

---

### 6. Meghana Nama (#7 - Knowledge Management & Help Articles)
* **Public Help Route**:
  * `GET /api/help`: Public (no auth required) so customers can read published articles.
* **Restricted Publishing Routes**:
```javascript
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

// Drafts & publishing can ONLY be done by Knowledge Managers or Supervisors
router.post('/api/help-drafts', requireAuth, requireRole(['knowledge_manager', 'supervisor']), draftController.createDraft);
router.post('/api/help-drafts/:id/publish', requireAuth, requireRole(['knowledge_manager', 'supervisor']), draftController.publishDraft);
```

---

### 7. V Samhita Reddy (#8 - Support Staff Dashboard & Ticket Assignment)
* **Staff Queue Protection**:
```javascript
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

// Specialist Queue: Only accessible by support_specialist and supervisor
router.get('/api/specialist/queue', requireAuth, requireRole(['support_specialist', 'supervisor']), queueController.getQueue);

// Supervisor Assignment endpoint:
router.post('/api/tickets/:id/assignment', requireAuth, requireRole(['supervisor']), assignmentController.assign);
```
* **Frontend**: Wrap your Staff Dashboard route with `<ProtectedRoute allowedRoles={['support_specialist', 'supervisor']}>`.

---

### 8. K Akshara Reddy (#9 - Help Center Frontend)
* **Help Center integration**:
  * Browse articles (`GET /api/help`) is accessible to both guests and logged-in customers.
  * If the user is logged in (use `const { user, isCustomer } = useAuth()`), display their organization badge and a quick link: `"Need more help? Open a ticket or chat with support"`.

---

### 9. B Siri Chandana (#10 - Testing, Security Checks & Deployment)
* **Preetham's Security Controls to verify**:
  1. **Brute Force Protection**: Send 6 invalid POST requests to `/api/auth/login`. Request #6 must return `429 Too Many Requests`.
  2. **Self-Assignment Vulnerability Test**: Send `POST /api/auth/signup` with payload `{"role": "supervisor"}`. The created user in MongoDB must still have `role: "customer"`.
  3. **CSRF Validation**: Send a mutating `POST /api/tickets` without `X-CSRF-Token` header. Must return `403 Invalid or missing CSRF token`.
  4. **Session Cookie**: Verify `support_desk.sid` cookie has `HttpOnly: true` and `SameSite: Lax/Strict`.
  5. **Cross-Tenant Isolation**: Log in as `bob@piedpiper.com` and attempt to access `alice@acme.com`'s org tickets. Must return `403 ORG_ACCESS_DENIED`.
