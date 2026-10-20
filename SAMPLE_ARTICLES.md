# Knowledge Management — Sample Articles & AI Test Scenarios

This document provides a complete reference of the sample help articles created for the **Subscription Product Support Desk** portal, including multi-version documentation snapshots and intentional policy conflicts for AI Chatbot (RAG) evaluation.

---

## 📚 Summary of Articles

| # | Article Title | Topic | Status | Versions Covered | Purpose |
| :- | :--- | :---: | :---: | :---: | :--- |
| **1** | Managing Subscription Plans, Upgrades, and Invoices | `Billing` | Published | v1.0, v2.0 | Multi-version tier upgrade guide with v1.0 snapshot history |
| **2** | Setting Up Two-Factor Authentication and Single Sign-On | `Authentication` | Published | v1.0, v2.0 | Security guide with v1.0 SMS history and v2.0 SSO |
| **3** | Subscription Refund Policy: 30-Day Money-Back Guarantee | `Billing` | Published | v2.0 | **Conflict A**: 100% full refund guarantee |
| **4** | General Policy on Subscription Billing and Non-Refundable Charges | `Billing` | Published | v1.0 | **Conflict B**: Strictly non-refundable policy |
| **5** | Resolving Payment Declines and Subscription Renewal Issues | `Troubleshooting` | Draft | v1.0, v2.0 | Admin draft demonstrating v1.0 reference & v2.0 draft revisions |

---

## 🔄 1. Articles with Multiple Versions (v1.0 & v2.0)

### Article 1: "Managing Subscription Plans, Upgrades, and Invoices"
* **Topic**: `Billing`
* **Applicable Versions**: `["v1.0", "v2.0"]`
* **Current Live Version**: `v2.0`

#### 📖 Version 1.0 (Archived Snapshot in `versionHistory`):
> **Title**: Subscription Billing Overview  
> **Published At**: 14 days ago  
> **Change Summary**: Initial publication covering v1.0 billing and payment setup  
>
> Welcome to the subscription billing guide for our platform. This guide explains how billing cycles work and how to keep your payment details current.
>
> **Overview of Subscription Plans**:  
> We offer Starter and Professional monthly subscription plans. Billing takes place automatically on the first day of each calendar month. Payments are processed using standard credit or debit cards.
>
> **Managing Your Payment Method**:  
> To update your billing card:  
> 1. Log in to your account and navigate to Profile > Billing Information.  
> 2. Enter your updated credit card number, expiration date, and billing postal code.  
> 3. Save your changes. Future monthly charges will automatically be billed to this card.
>
> **Requesting Receipts and Invoices**:  
> Payment confirmations are emailed directly to the primary account owner upon successful renewal. If your accounting department requires a formal invoice or VAT receipt, please submit a billing request ticket to our support desk, and our finance team will generate and send you a PDF invoice within 2 business days.
>
> **Cancellations**:  
> You can cancel your subscription at any time by contacting customer support before your next monthly billing date.

#### 🚀 Version 2.0 (Active Live Published Version):
> Learn how to manage tier changes, payment methods, and invoice downloads.
>
> **Upgrading Your Plan**:  
> You can upgrade your subscription tier at any time. Navigate to Account Settings and select the Billing tab. Choose the plan that best fits your team's needs (Starter, Professional, or Enterprise). Plan upgrades take effect immediately, and any unused balance from your current cycle will automatically be credited toward your new tier as prorated billing.
>
> **Downgrading Your Plan**:  
> If you choose to downgrade your subscription, your current plan benefits and seat limits will remain active until the end of your billing period. The lower tier pricing and features will take effect on your next scheduled renewal date.
>
> **Updating Payment Methods**:  
> We accept all major credit cards and debit cards. To update your billing card on file, open Account Settings, select Payment Methods, and click Edit. All transactions are securely processed and encrypted.
>
> **Downloading Invoices**:  
> Receipts and tax invoices are automatically generated after every successful payment. You can review and download PDF copies of your monthly or annual receipts anytime under Billing History.

---

### Article 2: "Setting Up Two-Factor Authentication and Single Sign-On"
* **Topic**: `Authentication`
* **Applicable Versions**: `["v1.0", "v2.0"]`
* **Current Live Version**: `v2.0`

#### 📖 Version 1.0 (Archived Snapshot):
> **Title**: Two-Factor Authentication Setup Guide  
> Keeping your account secure is our top priority. This guide explains how to enable two-factor authentication for your individual user login.
>
> **How to Enable**:  
> 1. Log in and open Account Settings.  
> 2. Select the Security tab.  
> 3. Enter your mobile phone number and click Send Verification Code.  
> 4. Enter the six-digit SMS code you receive on your phone to verify your number.  
> 5. Two-factor authentication is now active for all future logins.

#### 🚀 Version 2.0 (Active Live Published Version):
> Protecting your workspace account is essential for keeping your subscription data secure. This guide walks you through enabling Two-Factor Authentication and configuring Single Sign-On for your organization.
>
> **Enabling Two-Factor Authentication**:  
> 1. Go to your Profile Settings and select Security.  
> 2. Turn on the Two-Factor Authentication switch.  
> 3. Use your preferred authenticator app on your smartphone to scan the setup barcode.  
> 4. Enter the six-digit verification code to confirm activation.  
> 5. Save your backup recovery keys in a safe place in case you lose access to your phone.
>
> **Configuring Single Sign-On for Teams**:  
> Organizations on the Enterprise plan can enable Single Sign-On so employees can log in using their company identity provider such as Google Workspace, Microsoft 365, or Okta.

---

## ⚡ 2. Intentional Policy Conflict Scenario (For AI Chatbot Evaluation)

These two articles present contradictory business rules under the `Billing` topic. They are used to test whether the RAG AI chatbot can detect conflicts or resolve them using the user's software version filter:

### Article A (New Policy - v2.0):
* **Title**: `Subscription Refund Policy: 30-Day Money-Back Guarantee`
* **Applicable Version**: `["v2.0"]`
* **Policy Statement**:
  > *"All annual and monthly subscription plans include a full 30-day money-back guarantee. If you are not satisfied with the product or service, you can request a cancellation within the first 30 days of your purchase or renewal. Our support desk issues a complete 100% refund directly back to your original payment card within 3 business days."*

### Article B (Legacy Policy - v1.0):
* **Title**: `General Policy on Subscription Billing and Non-Refundable Charges`
* **Applicable Version**: `["v1.0"]`
* **Policy Statement**:
  > *"All subscription charges and renewals are strictly non-refundable. Once a payment is processed at the start of a billing cycle, no cash refunds, card chargebacks, or partial credits will be issued under any circumstances. When cancelled, service remains active until the end of the term without reimbursement."*

### 🧪 Expected AI Test Behavior:
1. When asked *"Can I get a refund for my subscription?"* without a version:  
   **AI should report a potential policy conflict or ask which version of the product the user is subscribed to.**
2. When queried with `?productVersion=v2.0`:  
   **AI retrieves Article A and confirms a 100% refund within 30 days.**
3. When queried with `?productVersion=v1.0`:  
   **AI retrieves Article B and informs the user that charges are non-refundable.**

---

## 🛠️ 3. API Endpoints Quick Reference

| Action | HTTP Request |
| :--- | :--- |
| **All Published Articles** | `GET http://localhost:5000/api/articles` |
| **Filter by Version 2.0** | `GET http://localhost:5000/api/articles?productVersion=v2.0` |
| **Filter by Version 1.0** | `GET http://localhost:5000/api/articles?productVersion=v1.0` |
| **Search by Keyword** | `GET http://localhost:5000/api/articles?search=refund` |
| **Get Historical Snapshot v1** | `GET http://localhost:5000/api/articles/:slug?version=1` |
| **Admin View (All Statuses)** | `GET http://localhost:5000/api/admin/articles` |
