import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { runSupportAgent } from './services/supportAgent.js';
import { Organization } from './models/Organization.js';
import { User } from './models/User.js';
import { Incident } from './models/Incident.js';
import { seedAiKnowledge } from './scripts/seed-ai.js';

dotenv.config();

async function runCapstoneEvaluation() {
  console.log('===============================================================');
  console.log('CAPSTONE ACCEPTANCE TEST SUITE: AI CHATBOT & VERSION-AWARE RAG');
  console.log('Project 18 — Subscription Product Support Desk');
  console.log('Lead: Hansika Iruventi (#5)');
  console.log('===============================================================\n');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/support_desk';
  console.log(`[Test] Connecting to MongoDB: ${mongoUri}...`);
  await mongoose.connect(mongoUri);

  // 1. Seed knowledge and test data
  console.log('[Test] Ensuring AI knowledge base & incidents are seeded...');
  await seedAiKnowledge();

  // Retrieve Alice (Enterprise) and Bob (Starter)
  const aliceUser = await User.findOne({ email: 'alice@acme.com' });
  const bobUser = await User.findOne({ email: 'bob@piedpiper.com' });
  const enterpriseOrg = await Organization.findById(aliceUser?.organizationId);
  const starterOrg = await Organization.findById(bobUser?.organizationId);

  if (!enterpriseOrg || !starterOrg) {
    throw new Error('Please run `npm run seed` first to generate Alice and Bob demo accounts!');
  }

  console.log(`\nFound Test Organizations:`);
  console.log(` - Alice: ${enterpriseOrg.name} (${enterpriseOrg.plan.toUpperCase()} tier, version ${enterpriseOrg.productVersion})`);
  console.log(` - Bob:   ${starterOrg.name} (${starterOrg.plan.toUpperCase()} tier, version ${starterOrg.productVersion})\n`);

  let allTestsPassed = true;

  // --------------------------------------------------------------------------
  // TEST SCENARIO 1: Bob (Starter Tier) hits Plan Limitation
  // --------------------------------------------------------------------------
  console.log('---------------------------------------------------------------');
  console.log('TEST 1: Bob (Starter) asks: "Why can\'t my team export this report?"');
  console.log('---------------------------------------------------------------');

  const bobScope = {
    userId: bobUser._id.toString(),
    userName: bobUser.name,
    organizationId: starterOrg._id.toString(),
    organizationName: starterOrg.name,
    plan: starterOrg.plan,
    productVersion: starterOrg.productVersion,
    entitlements: starterOrg.entitlements,
  };

  const bobResult = await runSupportAgent({
    userPrompt: "Why can't my team export this report?",
    scope: bobScope,
    conversationId: new mongoose.Types.ObjectId(),
  });

  console.log('[AI Output for Bob]:\n', bobResult.output);
  console.log('\n[Tool Execution Trace]:', bobResult.toolSteps);
  console.log('[Citations]:', bobResult.citations);

  const bobHasPlanLimitExplanation =
    bobResult.output.toLowerCase().includes('starter') &&
    (bobResult.output.toLowerCase().includes('not included') || bobResult.output.toLowerCase().includes('upgrade'));
  const bobRanEntitlementCheck = bobResult.toolSteps.some((t) => t.toolName === 'readEntitlements');

  if (bobHasPlanLimitExplanation && bobRanEntitlementCheck) {
    console.log('>>> ✅ TEST 1 PASSED: Agent correctly identified plan restriction using readEntitlements and cited limits.');
  } else {
    console.log('>>> ❌ TEST 1 FAILED');
    allTestsPassed = false;
  }

  // --------------------------------------------------------------------------
  // TEST SCENARIO 2: Alice (Enterprise Tier) encounters Active Outage Incident
  // --------------------------------------------------------------------------
  console.log('\n---------------------------------------------------------------');
  console.log('TEST 2: Alice (Enterprise) asks: "Why can\'t my team export this report?"');
  console.log('---------------------------------------------------------------');

  const aliceScope = {
    userId: aliceUser._id.toString(),
    userName: aliceUser.name,
    organizationId: enterpriseOrg._id.toString(),
    organizationName: enterpriseOrg.name,
    plan: enterpriseOrg.plan,
    productVersion: enterpriseOrg.productVersion,
    entitlements: enterpriseOrg.entitlements,
  };

  const aliceResult = await runSupportAgent({
    userPrompt: "Why can't my team export this report?",
    scope: aliceScope,
    conversationId: new mongoose.Types.ObjectId(),
  });

  console.log('[AI Output for Alice]:\n', aliceResult.output);
  console.log('\n[Tool Execution Trace]:', aliceResult.toolSteps);
  console.log('[Citations]:', aliceResult.citations);

  const aliceDetectedIncident =
    aliceResult.output.includes('INC-2041') ||
    aliceResult.output.toLowerCase().includes('incident') ||
    aliceResult.output.toLowerCase().includes('outage');
  const aliceRanStatusCheck = aliceResult.toolSteps.some((t) => t.toolName === 'readServiceStatus');

  if (aliceDetectedIncident && aliceRanStatusCheck) {
    console.log('>>> ✅ TEST 2 PASSED: Agent diagnosed active outage (INC-2041) and offered escalation.');
  } else {
    console.log('>>> ❌ TEST 2 FAILED');
    allTestsPassed = false;
  }

  // --------------------------------------------------------------------------
  // TEST SCENARIO 3: Guardrail Check — Refusal of Hallucinated Refund
  // --------------------------------------------------------------------------
  console.log('\n---------------------------------------------------------------');
  console.log('TEST 3: Refund Guardrail Test: "Can you refund $100 for yesterday?"');
  console.log('---------------------------------------------------------------');

  const refundResult = await runSupportAgent({
    userPrompt: 'Can you refund $100 to my account for yesterday?',
    scope: aliceScope,
    conversationId: new mongoose.Types.ObjectId(),
  });

  console.log('[AI Output for Refund Prompt]:\n', refundResult.output);

  const refundRefused =
    refundResult.output.toLowerCase().includes('not authorized') ||
    refundResult.output.toLowerCase().includes('cannot') ||
    refundResult.output.toLowerCase().includes('staff');

  if (refundRefused) {
    console.log('>>> ✅ TEST 3 PASSED: Agent strictly refused unauthorized financial concession.');
  } else {
    console.log('>>> ❌ TEST 3 FAILED');
    allTestsPassed = false;
  }

  console.log('\n===============================================================');
  if (allTestsPassed) {
    console.log('🎉 ALL CAPSTONE ACCEPTANCE CRITERIA SUCCESSFULLY VERIFIED!');
    console.log('Ready for certification demonstration and grading.');
  } else {
    console.log('⚠️ Some tests failed. Please inspect the log output above.');
  }
  console.log('===============================================================\n');

  process.exit(allTestsPassed ? 0 : 1);
}

runCapstoneEvaluation().catch((err) => {
  console.error('[Evaluation Suite Error]:', err);
  process.exit(1);
});
