const mongoose = require('mongoose');
require('dotenv').config();
const Article = require('./models/Article');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/support_desk';

const sampleArticles = [
  // 1. Published Article - Billing (Version 1 snapshot in history + Version 2 live)
  {
    title: 'Managing Subscription Plans, Upgrades, and Invoices',
    slug: 'managing-subscription-plans-upgrades-invoices',
    topic: 'Billing',
    applicableVersions: ['v1.0', 'v2.0'],
    status: 'published',
    currentVersion: 2,
    content: `Learn how to manage tier changes, payment methods, and invoice downloads.

Upgrading Your Plan:
You can upgrade your subscription tier at any time. Navigate to Account Settings and select the Billing tab. Choose the plan that best fits your team's needs (Starter, Professional, or Enterprise). Plan upgrades take effect immediately, and any unused balance from your current cycle will automatically be credited toward your new tier as prorated billing.

Downgrading Your Plan:
If you choose to downgrade your subscription, your current plan benefits and seat limits will remain active until the end of your billing period. The lower tier pricing and features will take effect on your next scheduled renewal date.

Updating Payment Methods:
We accept all major credit cards and debit cards. To update your billing card on file, open Account Settings, select Payment Methods, and click Edit. All transactions are securely processed and encrypted.

Downloading Invoices:
Receipts and tax invoices are automatically generated after every successful payment. You can review and download PDF copies of your monthly or annual receipts anytime under Billing History.`,
    versionHistory: [
      {
        version: 1,
        title: 'Subscription Billing Overview',
        content: `Welcome to the subscription billing guide for our platform. This guide explains how billing cycles work and how to keep your payment details current.

Overview of Subscription Plans:
We offer Starter and Professional monthly subscription plans. Billing takes place automatically on the first day of each calendar month. Payments are processed using standard credit or debit cards.

Managing Your Payment Method:
To update your billing card:
1. Log in to your account and navigate to Profile > Billing Information.
2. Enter your updated credit card number, expiration date, and billing postal code.
3. Save your changes. Future monthly charges will automatically be billed to this card.

Requesting Receipts and Invoices:
Payment confirmations are emailed directly to the primary account owner upon successful renewal. If your accounting department requires a formal invoice or VAT receipt, please submit a billing request ticket to our support desk, and our finance team will generate and send you a PDF invoice within 2 business days.

Cancellations:
You can cancel your subscription at any time by contacting customer support before your next monthly billing date.`,
        publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        changeSummary: 'Initial publication covering v1.0 billing and payment setup'
      }
    ]
  },

  // 2. Published Article - Authentication (Version 1 snapshot in history + Version 2 live)
  {
    title: 'Setting Up Two-Factor Authentication and Single Sign-On',
    slug: 'setting-up-two-factor-authentication-and-sso',
    topic: 'Authentication',
    applicableVersions: ['v1.0', 'v2.0'],
    status: 'published',
    currentVersion: 2,
    content: `Protecting your workspace account is essential for keeping your subscription data secure. This guide walks you through enabling Two-Factor Authentication and configuring Single Sign-On for your organization.

Enabling Two-Factor Authentication:
Two-factor authentication adds an extra layer of protection to your account by requiring a verification code when signing in.
1. Go to your Profile Settings and select Security.
2. Turn on the Two-Factor Authentication switch.
3. Use your preferred authenticator app on your smartphone to scan the setup barcode.
4. Enter the six-digit verification code to confirm activation.
5. Save your backup recovery keys in a safe place in case you lose access to your phone.

Configuring Single Sign-On for Teams:
Organizations on the Enterprise plan can enable Single Sign-On so employees can log in using their company identity provider such as Google Workspace, Microsoft 365, or Okta. Workspace administrators can enable this option from Workspace Settings under Authentication.

Password Resets and Recovery:
If a team member forgets their password, they can click Forgot Password on the login page to receive a secure reset link by email. Administrators can also trigger a password reset for any user from the Team Members panel.`,
    versionHistory: [
      {
        version: 1,
        title: 'Two-Factor Authentication Setup Guide',
        content: `Keeping your account secure is our top priority. This guide explains how to enable two-factor authentication for your individual user login.

What is Two-Factor Authentication:
Two-factor authentication adds an extra layer of verification to your account. When enabled, signing in requires both your standard password and a temporary verification code sent to your mobile phone.

How to Enable Two-Factor Authentication:
1. Log in and open Account Settings.
2. Select the Security tab.
3. Enter your mobile phone number and click Send Verification Code.
4. Enter the six-digit SMS code you receive on your phone to verify your number.
5. Two-factor authentication is now active for all future logins.

Lost Phone or Unable to Receive Codes:
If you lose access to your registered mobile phone, you must contact our support desk to verify your identity and have an administrator temporarily reset your authentication settings.`,
        publishedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
        changeSummary: 'First release of basic two-factor SMS authentication documentation'
      }
    ]
  },

  // 3. Published Article (Conflict A) - Billing (Version 1 snapshot in history + Version 2 live)
  {
    title: 'Subscription Refund Policy: 30-Day Money-Back Guarantee',
    slug: 'subscription-refund-policy-30-day-guarantee',
    topic: 'Billing',
    applicableVersions: ['v2.0'],
    status: 'published',
    currentVersion: 2,
    content: `Overview of our customer satisfaction refund policy:

Full 30-Day Refund Guarantee:
All annual and monthly subscription plans include a full 30-day money-back guarantee. If you are not satisfied with the product or service, you can request a cancellation within the first 30 days of your purchase or renewal.

How Refunds Are Processed:
Our support desk issues a complete 100% refund directly back to your original payment card within 3 business days of receiving your cancellation request.

Exceptions:
Accounts with active customized enterprise contracts should consult their dedicated account manager for specific agreement terms.`,
    versionHistory: [
      {
        version: 1,
        title: 'Subscription Refund Policy: Initial 14-Day Window',
        content: `Overview of the original customer refund policy for version 1.0:

14-Day Refund Window:
Under our initial launch policy, customers were entitled to a 14-day refund window from the date of purchase. Refund requests had to be submitted via email to support.

Processing and Deductions:
Refund requests took between 7 to 10 business days to process and were subject to a 5% administrative card transaction processing fee.`,
        publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        changeSummary: 'Initial 14-day refund policy before upgrading to 30-day full guarantee'
      }
    ]
  },

  // 4. Published Article (Conflict B) - Billing (Version 1 snapshot in history + Version 2 live)
  {
    title: 'General Policy on Subscription Billing and Non-Refundable Charges',
    slug: 'general-policy-non-refundable-charges',
    topic: 'Billing',
    applicableVersions: ['v1.0'],
    status: 'published',
    currentVersion: 2,
    content: `General billing terms and charge policies:

Strict No-Refund Policy:
All subscription charges and renewals are strictly non-refundable. Once a payment is processed at the start of a billing cycle, no cash refunds, card chargebacks, or partial credits will be issued under any circumstances.

Cancellations:
If you cancel your subscription plan, your account will remain active until the end of your prepaid term. At the end of the term, your subscription will expire without renewal, but previous payments will not be reimbursed.`,
    versionHistory: [
      {
        version: 1,
        title: 'General Terms on Automatic Plan Renewals',
        content: `Notice regarding recurring billing terms for version 1.0 accounts:

Automatic Renewals:
Subscriptions renew automatically at the end of each monthly or annual cycle unless cancelled by the customer prior to the renewal date.

Disputed Charges:
All recurring billing charges are final once processed. If you believe a charge was made in error due to system failure, please submit a support ticket within 48 hours for review.`,
        publishedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        changeSummary: 'Original automatic renewal policy notice'
      }
    ]
  },

  // 5. DRAFT Article - Troubleshooting (Version 1 snapshot in history + Version 2 working draft!)
  {
    title: 'Resolving Payment Declines and Subscription Renewal Issues',
    slug: 'resolving-payment-declines-and-renewal-issues',
    topic: 'Troubleshooting',
    applicableVersions: ['v1.0', 'v2.0'],
    status: 'draft',
    currentVersion: 2,
    content: `If you encounter an issue renewing your subscription or if a payment fails to process, follow the steps below to quickly restore full service.

Common Reasons for Payment Declines:
1. Expired Card: The card on file may have passed its expiration date.
2. Insufficient Funds or Daily Limits: Your financial institution may have temporary daily spending limits in place.
3. Fraud Prevention Holds: Banks sometimes temporarily hold recurring international transactions until confirmed by the account holder.
4. Billing Address Mismatch: The postal code or address entered must match the address on file with your bank.

How to Retry Your Payment:
Once you have confirmed with your bank that the charge is authorized, you can re-attempt the charge immediately:
1. Navigate to Account Settings and click Billing.
2. Verify that your card details and billing address are up to date.
3. Click Retry Payment to process the outstanding balance.

Grace Period and Account Access:
We provide a three-day grace period following any missed payment. During this window, your team retains uninterrupted access to all features while you update your billing information. If payment is not completed by the end of the grace period, the workspace will be temporarily placed on hold until an active payment method is provided.`,
    versionHistory: [
      {
        version: 1,
        title: 'Basic Steps for Resolving Payment Declines',
        content: `Basic troubleshooting for failed subscription payments:

If your credit card fails during subscription renewal, please review these basic steps:
1. Check with your card issuing bank to confirm that your card is authorized for recurring online subscriptions.
2. Re-enter your card details in your user profile to verify that there are no typographical errors in the expiration date or CVV.
3. If the payment continues to decline, submit a support ticket to our help desk and our billing staff will assist you manually.`,
        publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        changeSummary: 'Initial version 1.0 payment troubleshooting guide'
      }
    ]
  }
];

const seedDB = async () => {
  try {
    console.log(`Connecting to MongoDB at ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    await Article.deleteMany({});
    console.log('Cleared existing articles collection.');

    const created = await Article.insertMany(sampleArticles);
    console.log(`\nSuccessfully seeded ${created.length} articles with full Version 1 and Version 2 content:`);
    created.forEach((art) => {
      console.log(`  - [${art.status.toUpperCase()}] "${art.title}" (Version: v${art.currentVersion}.0, History Snapshots: ${art.versionHistory.length})`);
    });

    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedDB();
}

module.exports = { seedDB, sampleArticles };
