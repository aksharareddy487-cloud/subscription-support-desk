import { runSupportAgent } from '../services/supportAgent.js';
import { searchVersionAwareHelp } from '../services/vectorService.js';
import { extractCustomerScope } from '../middleware/auth.middleware.js';
import { sanitizeForModelContext } from '../utils/sanitize.js';
import { Conversation } from '../models/Conversation.js';
import { HelpArticle } from '../models/HelpArticle.js';
import { Incident } from '../models/Incident.js';

/**
 * POST /api/support-agent
 * Purposeful agent workflow with multi-tool investigation.
 */
export async function handleSupportAgent(req, res) {
  try {
    const { message, conversationId } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required' });
    }

    // Derive active customer scope strictly from authenticated session
    const customerScope = extractCustomerScope(req);

    // Retrieve or initialize conversation
    let conversation = null;
    if (conversationId) {
      conversation = await Conversation.findOne({
        _id: conversationId,
        organizationId: customerScope.organizationId,
      });
    }

    if (!conversation) {
      conversation = await Conversation.create({
        organizationId: customerScope.organizationId,
        customerId: customerScope.userId,
        messages: [],
      });
    }

    // Record customer message
    conversation.messages.push({
      sender: 'customer',
      text: message,
      timestamp: new Date(),
    });

    // Run agent with session-isolated scope
    const agentResult = await runSupportAgent({
      userPrompt: message,
      scope: customerScope,
      conversationId: conversation._id,
      chatHistory: conversation.messages.slice(-6).map((m) => [m.sender === 'customer' ? 'human' : 'ai', m.text]),
    });

    // Sanitize response to prevent sensitive leaks
    const cleanOutput = sanitizeForModelContext(agentResult.output);

    // Save assistant reply with citations and tool trace
    conversation.messages.push({
      sender: 'assistant',
      text: cleanOutput,
      citations: agentResult.citations || [],
      toolSteps: agentResult.toolSteps || [],
      timestamp: new Date(),
    });

    if (agentResult.escalationRecommended) {
      conversation.status = 'escalated';
    }

    await conversation.save();

    return res.status(200).json({
      success: true,
      conversationId: conversation._id,
      reply: cleanOutput,
      citations: agentResult.citations || [],
      toolSteps: agentResult.toolSteps || [],
      escalationRecommended: Boolean(agentResult.escalationRecommended),
      incidentCode: agentResult.incidentCode || null,
    });
  } catch (err) {
    console.error('[Support Agent Controller Error]:', err);
    return res.status(500).json({
      error: 'AI support agent investigation encountered an unexpected error.',
      details: err.message,
    });
  }
}

/**
 * POST /api/support-chat
 * Fast version-aware RAG Q&A without multi-step tool execution.
 */
export async function handleSupportChat(req, res) {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const customerScope = extractCustomerScope(req);
    const version = customerScope.productVersion || 'v2.4';

    const docs = await searchVersionAwareHelp(message, version, 2);
    if (!docs || docs.length === 0) {
      return res.status(200).json({
        reply: `I could not locate documentation matching your product version (${version}). I recommend opening a support ticket for specialized guidance.`,
        citations: [],
      });
    }

    const citations = docs.map((d) => ({
      docTitle: d.title,
      version: d.version,
      citationTag: d.citationTag,
    }));

    const reply = `According to our ${version} product documentation ${docs[0].citationTag}:\n\n${docs[0].content.slice(0, 400)}...\n\nFor more details, please visit the Help Center.`;

    return res.status(200).json({
      reply: sanitizeForModelContext(reply),
      citations,
    });
  } catch (err) {
    console.error('[Support Chat Controller Error]:', err);
    return res.status(500).json({ error: 'Error processing support chat request' });
  }
}

/**
 * GET /api/help
 * Public endpoint to browse published help articles.
 */
export async function getPublicHelpArticles(req, res) {
  try {
    const { version, category } = req.query;
    const filter = { status: 'published' };
    if (version) filter.version = version;
    if (category) filter.category = category;

    const articles = await HelpArticle.find(filter)
      .select('title slug version category citationsMetadata createdAt')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ articles });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch help articles' });
  }
}

/**
 * GET /api/status
 * Public sanitized service incident updates.
 */
export async function getPublicServiceStatus(req, res) {
  try {
    const incidents = await Incident.find({ status: { $ne: 'resolved' } })
      .select('incidentCode title affectedFeature severity status summary workaround createdAt')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      status: incidents.length === 0 ? 'All Systems Operational' : 'Degraded Performance',
      activeIncidentsCount: incidents.length,
      incidents,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch service status' });
  }
}
