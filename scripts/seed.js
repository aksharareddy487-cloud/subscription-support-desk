import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, USER_ROLES } from '../models/User.js';
import { Organization } from '../models/Organization.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/support_desk';
    console.log(`[Seed] Connecting to MongoDB: ${mongoUri}...`);
    await mongoose.connect(mongoUri);

    console.log('[Seed] Clearing existing Users and Organizations...');
    await User.deleteMany({});
    await Organization.deleteMany({});

    console.log('[Seed] Creating demo Organizations...');
    // 1. Enterprise Org (Has report export capability, v2.4)
    const acmeOrg = await Organization.create({
      name: 'Acme Cloud Corp',
      domain: 'acme.com',
      plan: 'enterprise',
      productVersion: 'v2.4',
      status: 'active',
      isVerified: true,
      entitlements: {
        maxSeats: 50,
        canExportReports: true,
        prioritySupport: true,
        apiAccess: true,
      },
    });

    // 2. Starter Org (Plan limit demo, v1.8)
    const piedPiperOrg = await Organization.create({
      name: 'Pied Piper Tech',
      domain: 'piedpiper.com',
      plan: 'starter',
      productVersion: 'v1.8',
      status: 'active',
      isVerified: true,
      entitlements: {
        maxSeats: 3,
        canExportReports: false, // For testing "Why can't my team export this report?"
        prioritySupport: false,
        apiAccess: false,
      },
    });

    console.log('[Seed] Creating seeded accounts for all roles...');
    const usersToCreate = [
      // 1. Enterprise Customer
      {
        name: 'Alice Acme (Enterprise)',
        email: 'alice@acme.com',
        passwordHash: 'Password123!', // Pre-save hook will hash this
        role: USER_ROLES.CUSTOMER,
        organizationId: acmeOrg._id,
        isEmailVerified: true,
      },
      // 2. Starter Customer (Hits plan limit)
      {
        name: 'Bob Piper (Starter)',
        email: 'bob@piedpiper.com',
        passwordHash: 'Password123!',
        role: USER_ROLES.CUSTOMER,
        organizationId: piedPiperOrg._id,
        isEmailVerified: true,
      },
      // 3. Support Specialist
      {
        name: 'Sarah Specialist',
        email: 'specialist@supportdesk.internal',
        passwordHash: 'Specialist123!',
        role: USER_ROLES.SUPPORT_SPECIALIST,
        isEmailVerified: true,
      },
      // 4. Knowledge Manager
      {
        name: 'Kevin Knowledge',
        email: 'knowledge@supportdesk.internal',
        passwordHash: 'Knowledge123!',
        role: USER_ROLES.KNOWLEDGE_MANAGER,
        isEmailVerified: true,
      },
      // 5. Supervisor
      {
        name: 'Sam Supervisor',
        email: 'supervisor@supportdesk.internal',
        passwordHash: 'Supervisor123!',
        role: USER_ROLES.SUPERVISOR,
        isEmailVerified: true,
      },
    ];

    for (const userData of usersToCreate) {
      const user = new User(userData);
      await user.save();
      console.log(` -> Created [${user.role}]: ${user.email}`);
    }

    console.log('\n================ SEED SUMMARY ================');
    console.log('Seeded Accounts Ready for Team Testing:');
    console.log('1. Customer (Enterprise): alice@acme.com / Password123!');
    console.log('2. Customer (Starter - Plan Limit): bob@piedpiper.com / Password123!');
    console.log('3. Support Specialist: specialist@supportdesk.internal / Specialist123!');
    console.log('4. Knowledge Manager: knowledge@supportdesk.internal / Knowledge123!');
    console.log('5. Supervisor: supervisor@supportdesk.internal / Supervisor123!');
    console.log('==============================================\n');

    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seedDatabase();
