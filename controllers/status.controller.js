import mongoose from 'mongoose';
import { Incident } from '../models/Incident.js';
import { Service } from '../models/Service.js';

// Normalize feature names (e.g. 'report-export' -> 'report_export')
const normalizeFeature = (feat = '') => feat.trim().toLowerCase().replace(/-/g, '_');

// Public route: sanitized service & incident updates
export const getStatus = async (req, res) => {
  try {
    // 1. Fetch service statuses
    let services = await Service.find().select('feature name status message lastUpdated -_id');

    // If services not yet seeded, provide nominal fallbacks
    if (!services || services.length === 0) {
      services = [
        { feature: 'login', name: 'Authentication & Login', status: 'operational', message: 'Login is working normally.' },
        { feature: 'payments', name: 'Payment Processing', status: 'operational', message: 'Payments operational.' },
        { feature: 'report_export', name: 'Report Export Worker', status: 'operational', message: 'Report generation operational.' },
      ];
    }

    // 2. Public sanitized active incidents (exclude internal staff notes)
    const activeIncidents = await Incident.find({
      isPublic: true,
      status: { $ne: 'resolved' },
    })
      .select('incidentCode title feature severity status affectedVersions publicSummary createdAt updatedAt')
      .sort({ createdAt: -1 });

    // 3. Recently resolved incidents
    const recentResolved = await Incident.find({
      isPublic: true,
      status: 'resolved',
    })
      .select('incidentCode title feature severity status affectedVersions publicSummary resolvedAt')
      .limit(5)
      .sort({ resolvedAt: -1 });

    // 4. Compute overall system health
    let systemStatus = 'operational';
    const hasCritical = activeIncidents.some((i) => i.severity === 'critical' || i.severity === 'high');
    const hasDegraded = activeIncidents.length > 0 || services.some((s) => s.status !== 'operational');

    if (hasCritical) {
      systemStatus = 'major_outage';
    } else if (hasDegraded) {
      systemStatus = 'degraded_performance';
    }

    res.json({
      success: true,
      systemStatus,
      timestamp: new Date().toISOString(),
      services,
      activeIncidents,
      recentResolved,
    });
  } catch (error) {
    console.error('Error fetching public status:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch status' });
  }
};

// GET /api/status/:feature (e.g. /api/status/payments or /api/status/report-export)
export const getServiceByFeature = async (req, res) => {
  try {
    const rawFeature = req.params.feature;
    const normalized = normalizeFeature(rawFeature);

    // Search in Service model
    let service = await Service.findOne({
      $or: [
        { feature: rawFeature.toLowerCase() },
        { feature: normalized },
      ],
    });

    // Also check any active incidents for this feature
    const activeIncidents = await Incident.find({
      $or: [
        { feature: rawFeature.toLowerCase() },
        { feature: normalized },
      ],
      status: { $ne: 'resolved' },
      isPublic: true,
    }).select('incidentCode title severity status publicSummary createdAt');

    if (!service && activeIncidents.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Service status for '${rawFeature}' not found.`,
      });
    }

    res.json({
      success: true,
      data: {
        feature: service?.feature || normalized,
        name: service?.name || rawFeature,
        status: service?.status || (activeIncidents.length > 0 ? 'degraded' : 'operational'),
        message: service?.message || (activeIncidents.length > 0 ? activeIncidents[0].publicSummary : 'Service operational.'),
        activeIncidents,
      },
    });
  } catch (error) {
    console.error('Error fetching feature status:', error);
    res.status(500).json({ success: false, message: 'Could not fetch service status.' });
  }
};

// GET /api/incidents or /api/status/incidents (supports ?feature=payments&status=monitoring)
export const getIncidentsAdmin = async (req, res) => {
  try {
    const { feature, status } = req.query;
    const query = {};

    if (feature) {
      const normalized = normalizeFeature(feature);
      query.$or = [{ feature: feature.toLowerCase() }, { feature: normalized }];
    }

    if (status) {
      query.status = status.toLowerCase();
    }

    const incidents = await Incident.find(query).sort({ createdAt: -1 });

    res.json(incidents);
  } catch (error) {
    console.error('Error fetching incidents list:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch incident list' });
  }
};

// GET /api/incidents/:id or /api/status/incidents/:id (lookup by Mongo _id or incidentCode like INC001)
export const getIncidentById = async (req, res) => {
  try {
    const rawId = req.params.id.trim();
    const isObjectId = mongoose.Types.ObjectId.isValid(rawId);

    const incident = await Incident.findOne({
      $or: [
        ...(isObjectId ? [{ _id: rawId }] : []),
        { incidentCode: rawId.toUpperCase() },
        { incidentCode: rawId },
      ],
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found.',
      });
    }

    res.json({
      success: true,
      data: incident,
    });
  } catch (error) {
    console.error('Error fetching incident by ID:', error);
    res.status(500).json({ success: false, message: 'Could not fetch incident.' });
  }
};

// POST /api/status/incidents
export const createIncident = async (req, res) => {
  try {
    const {
      incidentCode,
      title,
      feature,
      severity,
      status,
      affectedVersions,
      publicSummary,
      internalDetails,
      resolutionNotes,
    } = req.body;

    const normalizedFeature = normalizeFeature(feature || 'report_export');

    const incident = await Incident.create({
      incidentCode: incidentCode || `INC-${Date.now().toString().slice(-4)}`,
      title,
      feature: normalizedFeature,
      severity: severity || 'minor',
      status: status || 'investigating',
      affectedVersions: affectedVersions || ['v2.4'],
      publicSummary: publicSummary || title,
      internalDetails: internalDetails || '',
      resolutionNotes: resolutionNotes || '',
      isPublic: true,
    });

    // If an incident is major or critical, update corresponding Service status if exists
    if (['major', 'critical', 'high'].includes(severity)) {
      await Service.updateOne(
        { feature: normalizedFeature },
        { status: 'outage', message: publicSummary || title }
      ).catch(() => {});
    }

    res.status(201).json({ success: true, message: 'Incident created', incident });
  } catch (error) {
    console.error('Error creating incident:', error);
    res.status(500).json({ success: false, error: 'Failed to create incident' });
  }
};

// PATCH & PUT /api/status/incidents/:id
export const updateIncident = async (req, res) => {
  try {
    const rawId = req.params.id.trim();
    const { status, publicSummary, internalDetails, resolutionNotes } = req.body;

    const allowedStatuses = ['investigating', 'identified', 'monitoring', 'resolved'];

    if (status !== undefined && !allowedStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${allowedStatuses.join(', ')}`,
      });
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(rawId);
    const incident = await Incident.findOne({
      $or: [
        ...(isObjectId ? [{ _id: rawId }] : []),
        { incidentCode: rawId.toUpperCase() },
        { incidentCode: rawId },
      ],
    });

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    if (status) {
      incident.status = status.toLowerCase();
      if (incident.status === 'resolved') {
        incident.resolvedAt = new Date();
      }
    }

    if (publicSummary !== undefined) incident.publicSummary = publicSummary;
    if (internalDetails !== undefined) incident.internalDetails = internalDetails;
    if (resolutionNotes !== undefined) {
      incident.resolutionNotes = resolutionNotes;
      if (!internalDetails) {
        incident.internalDetails = resolutionNotes;
      }
    }

    await incident.save();

    // If resolved, restore the Service status to operational
    if (incident.status === 'resolved') {
      const remainingIncidents = await Incident.countDocuments({
        feature: incident.feature,
        status: { $ne: 'resolved' },
      });
      if (remainingIncidents === 0) {
        await Service.updateOne(
          { feature: incident.feature },
          { status: 'operational', message: 'Service operational.' }
        ).catch(() => {});
      }
    }

    res.json({
      success: true,
      message: 'Incident updated successfully.',
      incident,
      data: incident,
    });
  } catch (error) {
    console.error('Error updating incident:', error);
    res.status(500).json({ success: false, error: 'Failed to update incident' });
  }
};
