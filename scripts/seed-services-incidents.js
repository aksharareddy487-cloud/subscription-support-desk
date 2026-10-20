import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import { Service } from '../models/Service.js';
import { Incident } from '../models/Incident.js';

dotenv.config();

export const seedServicesAndIncidents = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await connectDB();

    console.log('[Seed] Clearing existing services and incidents...');
    await Service.deleteMany({});
    await Incident.deleteMany({});

    console.log('[Seed] Seeding Services...');
    const services = await Service.create([
      {
        feature: 'login',
        name: 'Authentication & Login Service',
        status: 'operational',
        message: 'Login is working normally.',
      },
      {
        feature: 'payments',
        name: 'Payment & Billing Gateway',
        status: 'outage',
        message: 'Some payments are currently failing.',
      },
      {
        feature: 'report_export',
        name: 'Report Export Worker',
        status: 'degraded',
        message: 'Report exports may take longer than usual.',
      },
    ]);
    console.log(` -> Seeded ${services.length} services.`);

    console.log('[Seed] Seeding Simulated Service Incidents...');
    const incidents = await Incident.create([
      {
        incidentCode: 'INC001',
        title: 'Payment processing failures',
        feature: 'payments',
        severity: 'high',
        status: 'investigating',
        affectedVersions: ['all'],
        publicSummary: 'Some users are experiencing failed payments when updating subscription billing.',
        description: 'Payment gateway webhooks timing out.',
        internalDetails: 'The team is investigating the payment service.',
        resolutionNotes: 'Investigating upstream stripe connection latency.',
        isPublic: true,
      },
      {
        incidentCode: 'INC002',
        title: 'Report Export Service Degraded',
        feature: 'report_export',
        severity: 'major',
        status: 'investigating',
        affectedVersions: ['v2.4'],
        publicSummary: 'We are currently investigating elevated latency and intermittent timeouts when generating and downloading CSV/PDF export reports. Customers on v2.4 may experience failed export jobs while our engineering team mitigates the bottleneck.',
        description: 'Slow report exports.',
        internalDetails: 'Worker queue pool node memory exhaustion in AWS us-east-1. Engineering is recycling container pods.',
        resolutionNotes: 'Performance improvements are being monitored.',
        isPublic: true,
      },
    ]);
    console.log(` -> Seeded ${incidents.length} simulated incidents.`);

    console.log('\n================ SEED SERVICES & INCIDENTS COMPLETE ================');
    return true;
  } catch (error) {
    console.error('[Seed Error]:', error);
    throw error;
  }
};

if (process.argv[1]?.endsWith('seed-services-incidents.js')) {
  seedServicesAndIncidents()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
