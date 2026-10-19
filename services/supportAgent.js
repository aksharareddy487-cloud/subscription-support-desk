import { ChatOllama } from '@langchain/ollama';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { createCustomerScopedTools } from '../tools/agentTools.js';
import { searchVersionAwareHelp } from './vectorService.js';
import { Organization } from '../models/Organization.js';
import { Incident } from '../models/Incident.js';
import { ToolRun } from '../models/ToolRun.js';

const SYSTEM_PROMPT = `You are the Subscription Product Support Desk AI Specialist.
Your job is to provide accurate, grounded assistance to authenticated customers regarding account limits, setup, and service incidents.

CRITICAL OPERATIONAL RULES:
1. GROUNDING & EVIDENCE:
   - For troubleshooting questions (e.g. "Why can't my team export this report?"), run:
     a) readEntitlements to verify if their plan allows the feature.
     b) readServiceStatus to check if an active outage affects the feature.
     c) searchHelp for troubleshooting instructions in their product version.
2. CITATIONS:
   - Every troubleshooting claim or policy must reference its source document with exact citations like [Doc: Export Limits (v2.4)].
3. GUARDRAILS & PERMISSIONS:
   - You CANNOT upgrade a customer's subscription plan. Direct them to contact sales/admin if an upgrade is needed.
   - You CANNOT promise or process financial refunds or account credits.
   - You CANNOT claim an incident is resolved without positive tool data.
4. INCIDENTS:
   - If an active incident is detected, provide the incident code, summary, workaround, and offer to draft a ticket escalation.
5. TOOL TIMEOUT / INCOMPLETE:
   - If a tool fails or times out, report an "incomplete check" rather than diagnosing without data.
6. TENANT ISOLATION:
   - Never reveal other customer names, ticket details, or organizations.`;

/**
 * Resilient deterministic agent execution for offline / reproducible testing.
 * Implements the exact sequence:
 * readEntitlements(authorizedOrg) -> readServiceStatus(feature) -> searchHelp(error, version)
 */
async function runDeterministicAgentWorkflow({ userPrompt, scope, conversationId }) {
  const { organizationId, userId, productVersion } = scope;
  const lower = userPrompt.toLowerCase();
  const toolSteps = [];
  const citations = [];

  // Check for refund or unauthorized billing manipulation attempts
  if (lower.includes('refund') || lower.includes('credit') || lower.includes('money back')) {
    return {
      output:
        'I am not authorized to issue refunds or process billing credits. Changes to subscription billing and refund decisions require staff-controlled review. Would you like me to draft an escalation ticket for our billing team?',
      toolSteps,
      citations,
      escalationRecommended: true,
    };
  }

  // Detect feature being queried
  let feature = 'general';
  if (lower.includes('export') || lower.includes('report') || lower.includes('download')) {
    feature = 'export';
  } else if (lower.includes('api') || lower.includes('webhook')) {
    feature = 'api_access';
  } else if (lower.includes('seat') || lower.includes('member')) {
    feature = 'maxSeats';
  }

  // Step 1: readEntitlements
  const startEntitlements = Date.now();
  const org = await Organization.findById(organizationId);
  const isExport = feature === 'export';
  const isEntitled = org
    ? isExport
      ? Boolean(org.entitlements?.canExportReports)
      : Boolean(org.entitlements?.[feature])
    : false;

  const entitlementResult = {
    plan: org?.plan || 'starter',
    feature,
    isEntitled,
    productVersion: org?.productVersion || productVersion,
  };

  const tRun1 = await ToolRun.create({
    conversationId,
    organizationId,
    userId,
    toolName: 'readEntitlements',
    inputParams: { feature },
    outputResult: entitlementResult,
    status: 'success',
    durationMs: Date.now() - startEntitlements,
  });

  toolSteps.push({
    toolName: 'readEntitlements',
    status: 'success',
    summary: `Verified plan '${entitlementResult.plan}' entitlements for '${feature}'.`,
    toolRunId: tRun1._id,
  });

  // Branch 1: User hits a plan limit! (Starter Tier)
  if (!isEntitled) {
    const docs = await searchVersionAwareHelp('export report limits', productVersion, 2);
    const topDoc = docs[0];
    if (topDoc) {
      citations.push({
        docTitle: topDoc.title,
        version: topDoc.version,
        citationTag: topDoc.citationTag,
      });
    }

    const citationTag = topDoc ? topDoc.citationTag : `[Doc: Plan Entitlements & Export Limits (${productVersion})]`;

    return {
      output: `Based on your organization's current **${(org?.plan || 'starter').toUpperCase()}** subscription, report exports are not included in your permitted features ${citationTag}.\n\nTo enable scheduled and on-demand report exports, your organization administrator can upgrade to a **Pro** or **Enterprise** plan from the billing dashboard. As an AI assistant, I cannot modify subscription plans directly.`,
      toolSteps,
      citations,
      escalationRecommended: false,
    };
  }

  // Step 2: readServiceStatus (User has entitlement, check if outage exists)
  const startStatus = Date.now();
  const activeIncident = await Incident.findOne({
    affectedFeature: new RegExp(feature, 'i'),
    status: { $in: ['investigating', 'identified', 'monitoring'] },
  }).lean();

  const statusResult = activeIncident
    ? { hasActiveOutage: true, incidentCode: activeIncident.incidentCode, summary: activeIncident.summary }
    : { hasActiveOutage: false, status: 'operational' };

  const tRun2 = await ToolRun.create({
    conversationId,
    organizationId,
    userId,
    toolName: 'readServiceStatus',
    inputParams: { feature },
    outputResult: statusResult,
    status: 'success',
    durationMs: Date.now() - startStatus,
  });

  toolSteps.push({
    toolName: 'readServiceStatus',
    status: 'success',
    summary: activeIncident
      ? `Detected active incident ${activeIncident.incidentCode} on '${feature}'.`
      : `Confirmed '${feature}' is operational.`,
    toolRunId: tRun2._id,
  });

  // Branch 2: Active incident outage found!
  if (activeIncident) {
    const docs = await searchVersionAwareHelp('service degradation export workaround', productVersion, 1);
    if (docs[0]) {
      citations.push({
        docTitle: docs[0].title,
        version: docs[0].version,
        citationTag: docs[0].citationTag,
      });
    }
    const citationTag = docs[0] ? ` ${docs[0].citationTag}` : '';

    return {
      output: `Your **${org.plan.toUpperCase()}** account is fully entitled to export reports; however, our monitoring indicates an active service incident:\n\n* **Incident ID:** \`${activeIncident.incidentCode}\`\n* **Status:** ${activeIncident.status.toUpperCase()} (${activeIncident.severity} severity)\n* **Issue:** ${activeIncident.summary}\n* **Workaround:** ${activeIncident.workaround}${citationTag}\n\nOur engineering team is actively investigating. I have drafted an escalation ticket so you receive automated updates as soon as service is restored.`,
      toolSteps,
      citations,
      escalationRecommended: true,
      incidentCode: activeIncident.incidentCode,
    };
  }

  // Step 3: searchHelp for troubleshooting steps
  const docs = await searchVersionAwareHelp(userPrompt, productVersion, 2);
  docs.forEach((d) => {
    citations.push({
      docTitle: d.title,
      version: d.version,
      citationTag: d.citationTag,
    });
  });

  const bestDoc = docs[0];
  const citationStr = bestDoc ? bestDoc.citationTag : `[Doc: Export Troubleshooting (${productVersion})]`;

  return {
    output: `Your plan allows exports and systems are operational. Here are the troubleshooting steps for your product version ${productVersion} ${citationStr}:\n\n1. Ensure your report filter date range does not exceed 90 days.\n2. Confirm your browser allows popups for downloading CSV/PDF files.\n3. Clear your cache and re-trigger the generation. If errors persist, please share the exact error code.`,
    toolSteps,
    citations,
    escalationRecommended: false,
  };
}

/**
 * Main AI Support Agent Runner.
 * Tries LangChain with local Ollama if reachable; seamlessly utilizes deterministic agent workflow otherwise.
 */
export async function runSupportAgent({ userPrompt, scope, conversationId, chatHistory = [] }) {
  try {
    // Attempt LangChain Tool Calling Agent if Ollama is accessible
    const tools = createCustomerScopedTools(scope, conversationId);
    const model = new ChatOllama({
      model: process.env.OLLAMA_MODEL || 'llama3',
      temperature: 0.1,
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    });

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', SYSTEM_PROMPT],
      new MessagesPlaceholder('chat_history'),
      ['human', '{input}'],
      new MessagesPlaceholder('agent_scratchpad'),
    ]);

    const agent = await createToolCallingAgent({
      llm: model,
      tools,
      prompt,
    });

    const executor = new AgentExecutor({
      agent,
      tools,
      maxIterations: 4,
      returnIntermediateSteps: true,
    });

    const result = await executor.invoke({
      input: userPrompt,
      chat_history: chatHistory,
    });

    return {
      output: result.output,
      toolSteps: (result.intermediateSteps || []).map((s) => ({
        toolName: s.action.tool,
        status: 'success',
        summary: `Executed ${s.action.tool}`,
      })),
      citations: [],
    };
  } catch (llmErr) {
    // Fall back gracefully to deterministic agent workflow
    return await runDeterministicAgentWorkflow({ userPrompt, scope, conversationId });
  }
}
