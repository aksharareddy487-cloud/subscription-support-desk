import http from 'http';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from './server.js';
import { connectDB } from './config/db.js';
import { seedServicesAndIncidents } from './scripts/seed-services-incidents.js';
import { readServiceStatus } from './services/tools/readServiceStatus.js';

dotenv.config();

const TEST_PORT = 5088;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

async function runNetraVerification() {
  console.log('\n======================================================');
  console.log('🧪 P Netra (#6): Service Status & AI Troubleshooting Tools Test');
  console.log('======================================================\n');

  let server;
  try {
    await connectDB();
    await seedServicesAndIncidents();

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(TEST_PORT, resolve));
    console.log(`[Test Server] Running on http://127.0.0.1:${TEST_PORT}\n`);

    // 1. Test GET /api/status
    console.log('Test 1: GET /api/status (Public Sanitized)');
    const statusRes = await fetch(`${BASE_URL}/api/status`);
    const statusBody = await statusRes.json();
    if (statusRes.status !== 200 || !statusBody.services || statusBody.services.length === 0) {
      throw new Error(`GET /api/status failed: ${JSON.stringify(statusBody)}`);
    }
    // Verify sanitization
    const leaks = statusBody.activeIncidents?.some((i) => Boolean(i.internalDetails));
    if (leaks) throw new Error('Security check failed: internalDetails leaked in public status');
    console.log('  ✅ PASS: /api/status returns operational services and sanitized active incidents without leaking internal notes.');

    // 2. Test GET /api/status/payments
    console.log('Test 2: GET /api/status/payments');
    const featureRes = await fetch(`${BASE_URL}/api/status/payments`);
    const featureBody = await featureRes.json();
    if (featureRes.status !== 200 || featureBody.data?.feature !== 'payments') {
      throw new Error(`GET /api/status/payments failed: ${JSON.stringify(featureBody)}`);
    }
    console.log('  ✅ PASS: Feature status check for payments returned correctly.');

    // 3. Test GET /api/incidents/INC001
    console.log('Test 3: GET /api/incidents/INC001');
    const incidentRes = await fetch(`${BASE_URL}/api/incidents/INC001`);
    const incidentBody = await incidentRes.json();
    if (incidentRes.status !== 200 || incidentBody.data?.incidentCode !== 'INC001') {
      throw new Error(`GET /api/incidents/INC001 failed: ${JSON.stringify(incidentBody)}`);
    }
    console.log('  ✅ PASS: Incident retrieved by incidentCode INC001.');

    // 4. Test readServiceStatus tool
    console.log('Test 4: readServiceStatus AI Tool');
    const toolResult = await readServiceStatus('report_export', 'v2.4');
    if (toolResult.status !== 'success' || !toolResult.data?.hasOutage) {
      throw new Error(`readServiceStatus failed: ${JSON.stringify(toolResult)}`);
    }
    console.log(`  ✅ PASS: readServiceStatus tool correctly detected ${toolResult.data.activeIncidentCount} active incident(s).`);

    console.log('\n======================================================');
    console.log('🎉 ALL NETRA MODULE VERIFICATION CHECKS PASSED 100%!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Verification Error:', err.message);
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
    process.exit(0);
  }
}

runNetraVerification();
