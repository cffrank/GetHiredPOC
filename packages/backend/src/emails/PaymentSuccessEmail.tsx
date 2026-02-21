/**
 * Payment Success Email Template
 *
 * Receipt email sent after successful PRO subscription purchase
 */

import { Text, Section, Hr } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/Layout';
import { Button } from './components/Button';

interface PaymentSuccessEmailProps {
  userName: string;
  amount: number;
  subscriptionId: string;
  startDate: string;
  nextBillingDate: string;
  dashboardUrl: string;
}

export function PaymentSuccessEmail({
  userName,
  amount,
  subscriptionId,
  startDate,
  nextBillingDate,
  dashboardUrl,
}: PaymentSuccessEmailProps) {
  return (
    <EmailLayout previewText="Thank you for upgrading to PRO!">
      <Text style={styles.greeting}>Hi {userName},</Text>

      <Text style={styles.paragraph}>
        Thank you for upgrading to <strong>GetHiredPOC PRO</strong>! Your payment was successful and
        your account has been activated.
      </Text>

      {/* Success Box */}
      <Section style={styles.successBox}>
        <Text style={styles.successTitle}>✅ Payment Successful</Text>
        <Text style={styles.successText}>
          Your PRO subscription is now active!
        </Text>
      </Section>

      {/* Receipt Details */}
      <Section style={styles.receiptBox}>
        <Text style={styles.receiptTitle}>Receipt</Text>

        <div style={styles.receiptRow}>
          <Text style={styles.receiptLabel}>Amount Paid:</Text>
          <Text style={styles.receiptValue}>${amount.toFixed(2)}</Text>
        </div>

        <div style={styles.receiptRow}>
          <Text style={styles.receiptLabel}>Subscription:</Text>
          <Text style={styles.receiptValue}>PRO Monthly</Text>
        </div>

        <div style={styles.receiptRow}>
          <Text style={styles.receiptLabel}>Started:</Text>
          <Text style={styles.receiptValue}>{startDate}</Text>
        </div>

        <div style={styles.receiptRow}>
          <Text style={styles.receiptLabel}>Next Billing:</Text>
          <Text style={styles.receiptValue}>{nextBillingDate}</Text>
        </div>

        <Hr style={styles.hr} />

        <div style={styles.receiptRow}>
          <Text style={styles.receiptLabel}>Subscription ID:</Text>
          <Text style={styles.receiptValueSmall}>{subscriptionId}</Text>
        </div>
      </Section>

      {/* What's Included */}
      <Section style={styles.featuresBox}>
        <Text style={styles.featuresTitle}>What's Included in PRO:</Text>
        <ul style={styles.list}>
          <li style={styles.listItem}>✓ Unlimited job searches per day</li>
          <li style={styles.listItem}>✓ Unlimited job applications</li>
          <li style={styles.listItem}>✓ Unlimited AI-generated resumes</li>
          <li style={styles.listItem}>✓ Unlimited cover letters</li>
          <li style={styles.listItem}>✓ Priority customer support</li>
          <li style={styles.listItem}>✓ Advanced analytics</li>
        </ul>
      </Section>

      <Button href={dashboardUrl}>
        Go to Dashboard
      </Button>

      <Text style={styles.footer}>
        Need help? Reply to this email or visit our support center.
      </Text>

      <Text style={styles.disclaimer}>
        You will be charged ${amount.toFixed(2)} per month. Cancel anytime from your account settings.
      </Text>
    </EmailLayout>
  );
}

const styles = {
  greeting: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '16px',
  },
  paragraph: {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#374151',
    marginBottom: '16px',
  },
  successBox: {
    backgroundColor: '#ecfdf5',
    border: '2px solid #10b981',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '24px',
    textAlign: 'center' as const,
  },
  successTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#065f46',
    marginBottom: '8px',
  },
  successText: {
    fontSize: '16px',
    color: '#047857',
    margin: '0',
  },
  receiptBox: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '24px',
  },
  receiptTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '16px',
  },
  receiptRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  receiptLabel: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0',
  },
  receiptValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
    margin: '0',
  },
  receiptValueSmall: {
    fontSize: '12px',
    color: '#6b7280',
    margin: '0',
  },
  hr: {
    borderColor: '#e5e7eb',
    margin: '16px 0',
  },
  featuresBox: {
    marginBottom: '24px',
  },
  featuresTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '12px',
  },
  list: {
    margin: '0',
    padding: '0 0 0 20px',
  },
  listItem: {
    fontSize: '14px',
    color: '#374151',
    marginBottom: '6px',
  },
  footer: {
    fontSize: '14px',
    color: '#6b7280',
    textAlign: 'center' as const,
    marginTop: '24px',
  },
  disclaimer: {
    fontSize: '12px',
    color: '#9ca3af',
    textAlign: 'center' as const,
    marginTop: '16px',
  },
};
