import { Incident } from '../../models/Incident.js';
import { Service } from '../../models/Service.js';

const normalizeFeature = (feat = '') => feat.trim().toLowerCase().replace(/-/g, '_');

export const readServiceStatus = async (featureName = 'report_export', productVersion = 'v2.4', options = {}) => {
  const startTime = Date.now();

  if (options.simulateTimeout) {
    throw new Error('TOOL_TIMEOUT: readServiceStatus timed out after 5000ms');
  }

  if (options.simulateFailure) {
    throw new Error('TOOL_EXECUTION_ERROR: Status check service failed');
  }

  const normalized = normalizeFeature(featureName);

  // Check Service status
  const service = await Service.findOne({
    $or: [{ feature: featureName.toLowerCase() }, { feature: normalized }],
  });

  // Find active, un-resolved incidents affecting this feature
  const activeIncidents = await Incident.find({
    $or: [{ feature: featureName.toLowerCase() }, { feature: normalized }],
    status: { $ne: 'resolved' },
    isPublic: true,
  });

  // Filter for incidents affecting this product version
  const matchingIncidents = activeIncidents.filter(
    (inc) =>
      !inc.affectedVersions ||
      inc.affectedVersions.length === 0 ||
      inc.affectedVersions.includes(productVersion) ||
      inc.affectedVersions.includes('all')
  );

  const hasOutage =
    matchingIncidents.length > 0 ||
    service?.status === 'outage' ||
    service?.status === 'degraded';

  return {
    status: 'success',
    durationMs: Date.now() - startTime,
    data: {
      feature: featureName,
      productVersion,
      serviceStatus: service?.status || (matchingIncidents.length > 0 ? 'degraded' : 'operational'),
      hasOutage,
      activeIncidentCount: matchingIncidents.length,
      incidents: matchingIncidents.map((inc) => ({
        id: inc._id,
        incidentCode: inc.incidentCode || inc._id,
        title: inc.title,
        severity: inc.severity,
        status: inc.status,
        publicSummary: inc.publicSummary,
      })),
    },
  };
};
