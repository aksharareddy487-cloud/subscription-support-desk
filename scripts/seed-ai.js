import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { HelpArticle } from '../models/HelpArticle.js';
import { Incident } from '../models/Incident.js';
import { getEmbedding } from '../services/embeddingService.js';

dotenv.config();

export async function seedAiKnowledge() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/support_desk';
    console.log(`[Seed AI] Connecting to MongoDB: ${mongoUri}...`);
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    console.log('[Seed AI] Refreshing Help Articles and Incidents...');
    await HelpArticle.deleteMany({});
    await Incident.deleteMany({});

    // 1. Versioned Help Articles
    const articles = [
      {
        title: 'Plan Entitlements and Report Export Limits',
        slug: 'plan-entitlements-export-v1',
        version: 'v1.8',
        category: 'account_limits',
        status: 'published',
        content:
          'In product version 1.8 (Starter Tier), automated report export is disabled. Only Pro and Enterprise organizations are entitled to generate scheduled and on-demand CSV or PDF reports. Users on Starter must upgrade to Pro to unlock export features.',
      },
      {
        title: 'Scheduled & On-Demand Report Export Guide',
        slug: 'report-export-guide-v2',
        version: 'v2.4',
        category: 'export_reports',
        status: 'published',
        content:
          'In product version 2.4, Pro and Enterprise organizations can export reports across CSV, XLSX, and JSON formats. Maximum export date range is 90 days. If an export job fails, verify your browser popup permissions and review the status page for active worker pipeline incidents.',
      },
      {
        title: 'Troubleshooting Export Queue Stalls and Outages',
        slug: 'troubleshooting-export-stalls-v2',
        version: 'v2.4',
        category: 'troubleshooting',
        status: 'published',
        content:
          'When report generation appears stuck or times out, check if an incident is active on the export subsystem. For active incidents, jobs are queued and will process automatically once worker nodes recover. Workaround: run smaller reports under 7 days.',
      },
      {
        title: 'API Rate Limits & Webhook Delivery',
        slug: 'api-rate-limits-v2',
        version: 'v2.4',
        category: 'integrations',
        status: 'published',
        content:
          'Enterprise plans include 10,000 API requests/minute. Webhooks retry with exponential backoff up to 5 times upon receiving 5xx server errors.',
      },
    ];

    console.log('[Seed AI] Generating embeddings for versioned articles...');
    for (const art of articles) {
      const vector = await getEmbedding(`${art.title} ${art.content}`);
      await HelpArticle.create({
        ...art,
        embedding: vector,
      });
      console.log(` -> Created Help Article (${art.version}): ${art.title}`);
    }

    // 2. Active Simulated Incident on Export Feature
    console.log('[Seed AI] Creating simulated export outage incident...');
    const incident = await Incident.create({
      incidentCode: 'INC-2041',
      title: 'Degraded Performance: Report Export Queue Latency',
      affectedFeature: 'export',
      severity: 'high',
      status: 'investigating',
      summary:
        'Background job workers for CSV/PDF report rendering are experiencing high latency and intermittent job timeouts.',
      workaround:
        'Filter queries to under 7 days or use the direct REST API endpoint while engineering scales worker instances.',
      impactedPlans: ['enterprise', 'pro'],
    });

    console.log(` -> Created Simulated Incident: [${incident.incidentCode}] ${incident.title}`);
    console.log('\n[Seed AI] Successfully populated version-aware articles and simulated incident!');
  } catch (err) {
    console.error('[Seed AI Error]:', err);
    throw err;
  }
}

// Run directly if invoked from command line
if (process.argv[1]?.endsWith('seed-ai.js')) {
  seedAiKnowledge()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
