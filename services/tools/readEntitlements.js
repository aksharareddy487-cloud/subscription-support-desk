import { Organization } from '../../models/Organization.js';

export const readEntitlements = async (scope, options = {}) => {
  const startTime = Date.now();

  if (options.simulateTimeout) {
    throw new Error('TOOL_TIMEOUT: readEntitlements timed out after 5000ms');
  }

  if (options.simulateFailure) {
    throw new Error('TOOL_EXECUTION_ERROR: Entitlement service unreachable');
  }

  if (!scope || !scope.organizationId) {
    return {
      status: 'failed',
      durationMs: Date.now() - startTime,
      error: 'Missing authorized organization scope in session',
    };
  }

  const org = await Organization.findById(scope.organizationId);
  if (!org) {
    return {
      status: 'failed',
      durationMs: Date.now() - startTime,
      error: 'Organization not found',
    };
  }

  return {
    status: 'success',
    durationMs: Date.now() - startTime,
    data: {
      organizationName: org.name,
      plan: org.plan,
      productVersion: org.productVersion,
      entitlements: org.entitlements,
      canExportReports: Boolean(org.entitlements?.canExportReports),
      maxSeats: org.entitlements?.maxSeats || 5,
      prioritySupport: Boolean(org.entitlements?.prioritySupport),
      apiAccess: Boolean(org.entitlements?.apiAccess),
    },
  };
};
