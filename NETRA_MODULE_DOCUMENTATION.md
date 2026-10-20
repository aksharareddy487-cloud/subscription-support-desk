# P Netra (#6) — Service Status, Incident Data & AI Troubleshooting Tools

## 📌 Assigned Work Overview
As assigned in the team roster for **Project 18 (Subscription Product Support Desk)**, this module delivers:
1. **Public Sanitized Service Status API (`GET /api/status`)**
2. **Feature Status Inspection (`GET /api/status/:feature`)**
3. **Incident Tracking & Lifecycle Management (`GET /api/incidents/:id`, `PUT /api/incidents/:id`)**
4. **AI Troubleshooting Tools (`readServiceStatus`, `readEntitlements`)**
5. **Simulated Services & Incidents Dataset (`login`, `payments`, `report_export`, `INC001`, `INC002`)**

---

## 🛠️ Data Models
- **`models/Service.js`**:
  Tracks real-time simulated health for core platform services:
  - `feature`: Normalized service identifier (`login`, `payments`, `report_export`)
  - `name`: Display name
  - `status`: `'operational'` | `'degraded'` | `'outage'`
  - `message`: Sanitized customer-facing status explanation
- **`models/Incident.js`**:
  Tracks active and resolved incidents:
  - `incidentCode`: Unique human-readable code (`INC001`, `INC002`)
  - `title`: Incident headline
  - `feature`: Impacted system component
  - `severity`: `'minor'` | `'medium'` | `'major'` | `'high'` | `'critical'`
  - `status`: `'investigating'` | `'identified'` | `'monitoring'` | `'resolved'`
  - `publicSummary`: Sanitized customer summary (no internal notes)
  - `internalDetails` / `resolutionNotes`: Private notes for support specialists

---

## 📡 API Endpoints

### 1. `GET /api/status`
- **Access**: Public (no authentication required)
- **Response**: Sanitized aggregate system status, operational service list, and active public incidents. Internal staff resolution notes and customer identities are omitted for security.

### 2. `GET /api/status/:feature`
- **Access**: Public
- **Example**: `GET /api/status/payments`, `GET /api/status/report-export`
- **Response**: Operational status and active incidents impacting that specific feature.

### 3. `GET /api/incidents/:id`
- **Access**: Public / Staff
- **Example**: `GET /api/incidents/INC001`
- **Response**: Detailed incident document.

### 4. `PUT /api/incidents/:id` & `PATCH /api/status/incidents/:id`
- **Access**: Support Specialists & Supervisors
- **Payload**:
  ```json
  {
    "status": "monitoring",
    "resolutionNotes": "Payment gateway fix deployed; monitoring transaction queues."
  }
  ```
- **Auditing**: Automatically logged via `logSensitiveAction('UPDATE_INCIDENT')`.

---

## 🤖 AI Troubleshooting Tools

### 1. `readServiceStatus(feature, productVersion, options)`
- Checks live MongoDB service operational status and un-resolved incidents.
- Filters by product version compatibility.
- Supports `simulateTimeout` and `simulateFailure` options to verify graceful **Incomplete Check** handling per project specification.

### 2. `readEntitlements(scope, options)`
- Inspects permitted plan features (`canExportReports`, `maxSeats`, `prioritySupport`, `apiAccess`) derived strictly from the verified session scope.
- Enforces strict **cross-customer tenant isolation**.

---

## 🧪 Verification Script
To seed services and run the verification test suite:
```bash
node test-netra-module.js
```
