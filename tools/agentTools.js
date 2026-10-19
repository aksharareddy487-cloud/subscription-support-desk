import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { Organization } from '../models/Organization.js';
import { Incident } from '../models/Incident.js';
import { ToolRun } from '../models/ToolRun.js';
import { searchVersionAwareHelp } from '../services/vectorService.js';

/**
 * Creates the authorized toolset scoped strictly to the customer's authenticated session.
 * Prevents prompt injection from probing other tenants' entitlements or data.
 *
 * @param {Object} scope - Authenticated customer scope from Preetham's auth middleware
 * @param {string} conversationId - Current conversation identifier
 */
export function createCustomerScopedTools(scope, conversationId) {
  const { organizationId, userId, productVersion } = scope;

  /**
   * Tool 1: readEntitlements
   * Derives active customer scope exclusively from session, ignoring user-supplied org IDs.
   */
  const readEntitlementsTool = new DynamicStructuredTool({
    name: 'readEntitlements',
    description: 'Checks the permitted features, plan tier, and export permissions for the authenticated organization.',
    schema: z.object({
      feature: z
        .string()
        .describe("The feature name being verified, e.g. 'export', 'reporting', 'api_access'"),
    }),
    func: async ({ feature }) => {
      const startTime = Date.now();
      try {
        const org = await Organization.findById(organizationId);
        if (!org) {
          throw new Error('Organization not found');
        }

        const isExportFeature = feature.toLowerCase().includes('export') || feature.toLowerCase().includes('report');
        const isEntitled = isExportFeature
          ? Boolean(org.entitlements?.canExportReports)
          : Boolean(org.entitlements?.[feature]);

        const result = {
          organizationId: org._id.toString(),
          organizationName: org.name,
          plan: org.plan,
          productVersion: org.productVersion,
          featureChecked: feature,
          isEntitled: isEntitled,
          reason: isEntitled
            ? `Feature '${feature}' is enabled on your ${org.plan.toUpperCase()} tier.`
            : `Feature '${feature}' is NOT included in your ${org.plan.toUpperCase()} tier. Requires Pro or Enterprise plan.`,
        };

        await ToolRun.create({
          conversationId,
          organizationId,
          userId,
          toolName: 'readEntitlements',
          inputParams: { feature },
          outputResult: result,
          status: 'success',
          durationMs: Date.now() - startTime,
        });

        return JSON.stringify(result);
      } catch (err) {
        await ToolRun.create({
          conversationId,
          organizationId,
          userId,
          toolName: 'readEntitlements',
          inputParams: { feature },
          outputResult: { error: err.message },
          status: 'failed',
          errorMessage: err.message,
          durationMs: Date.now() - startTime,
        });
        return JSON.stringify({ error: 'Entitlement check incomplete due to service error', status: 'incomplete' });
      }
    },
  });

  /**
   * Tool 2: readServiceStatus
   * Checks simulated or live incident status on the affected subsystem.
   */
  const readServiceStatusTool = new DynamicStructuredTool({
    name: 'readServiceStatus',
    description: 'Checks real-time incident status and outages on a specific system feature (e.g. export, reporting, billing).',
    schema: z.object({
      feature: z
        .string()
        .describe("The subsystem or feature to inspect, e.g., 'export', 'reporting', 'auth'"),
    }),
    func: async ({ feature }) => {
      const startTime = Date.now();
      try {
        const queryRegex = new RegExp(feature, 'i');
        const activeIncident = await Incident.findOne({
          affectedFeature: queryRegex,
          status: { $in: ['investigating', 'identified', 'monitoring'] },
        }).lean();

        let result;
        if (activeIncident) {
          result = {
            hasActiveOutage: true,
            incidentCode: activeIncident.incidentCode,
            title: activeIncident.title,
            status: activeIncident.status,
            severity: activeIncident.severity,
            summary: activeIncident.summary,
            workaround: activeIncident.workaround,
          };
        } else {
          result = {
            hasActiveOutage: false,
            status: 'operational',
            message: `All systems operational for feature: ${feature}. No active incidents reported.`,
          };
        }

        await ToolRun.create({
          conversationId,
          organizationId,
          userId,
          toolName: 'readServiceStatus',
          inputParams: { feature },
          outputResult: result,
          status: 'success',
          durationMs: Date.now() - startTime,
        });

        return JSON.stringify(result);
      } catch (err) {
        await ToolRun.create({
          conversationId,
          organizationId,
          userId,
          toolName: 'readServiceStatus',
          inputParams: { feature },
          outputResult: { error: err.message },
          status: 'incomplete',
          errorMessage: err.message,
          durationMs: Date.now() - startTime,
        });
        return JSON.stringify({ error: 'Service status check timed out or failed', status: 'incomplete' });
      }
    },
  });

  /**
   * Tool 3: searchHelp
   * Searches version-aware help articles and returns grounded documentation with citations.
   */
  const searchHelpTool = new DynamicStructuredTool({
    name: 'searchHelp',
    description: 'Searches version-grounded documentation for troubleshooting steps, setup guides, and limits.',
    schema: z.object({
      query: z.string().describe('Search term or error description'),
      error: z.string().optional().describe('Optional specific error code or snippet'),
    }),
    func: async ({ query, error }) => {
      const startTime = Date.now();
      try {
        const fullQuery = error ? `${query} ${error}` : query;
        const docs = await searchVersionAwareHelp(fullQuery, productVersion, 3);

        const result = docs.map((doc) => ({
          title: doc.title,
          version: doc.version,
          citationTag: doc.citationTag,
          summary: doc.content.slice(0, 300) + '...',
        }));

        await ToolRun.create({
          conversationId,
          organizationId,
          userId,
          toolName: 'searchHelp',
          inputParams: { query, error, productVersion },
          outputResult: result,
          status: 'success',
          durationMs: Date.now() - startTime,
        });

        return JSON.stringify(result);
      } catch (err) {
        await ToolRun.create({
          conversationId,
          organizationId,
          userId,
          toolName: 'searchHelp',
          inputParams: { query, error },
          outputResult: { error: err.message },
          status: 'failed',
          errorMessage: err.message,
          durationMs: Date.now() - startTime,
        });
        return JSON.stringify({ error: 'Documentation search failed', status: 'incomplete' });
      }
    },
  });

  return [readEntitlementsTool, readServiceStatusTool, searchHelpTool];
}
