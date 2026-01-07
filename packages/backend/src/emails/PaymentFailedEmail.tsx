/**
 * Payment Failed Email Template
 *
 * Dunning email sent when a payment fails
 * Prompts user to update payment method to avoid service interruption
 */

import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/Layout';
import { Button } from './components/Button';

interface PaymentFailedEmailProps {
  userName: string;
  amount: number;
  failureReason: string;
  retryDate: string;
  updatePaymentUrl: string;
}

export function PaymentFailedEmail({
  userName,
  amount,
  failureReason,
  retryDate,
  updatePaymentUrl,
}: PaymentFailedEmailProps) {
  return (
    <EmailLayout previewText="Action required: Payment failed">
      <Text style={styles.greeting}>Hi {userName},</Text>

      <Text style={styles.paragraph}>
        We were unable to process your recent payment for GetHiredPOC PRO. Your subscription is still
        active, but action is required to avoid service interruption.
      </Text>

      {/* Error Box */}
      <Section style={styles.errorBox}>
        <Text style={styles.errorTitle}>⚠️ Payment Failed</Text>
        <div style={styles.errorRow}>
          <Text style={styles.errorLabel}>Amount:</Text>
          <Text style={styles.errorValue}>${amount.toFixed(2)}</Text>
        </div>
        <div style={styles.errorRow}>
          <Text style={styles.errorLabel}>Reason:</Text>
          <Text style={styles.errorValue}>{failureReason}</Text>
        </div>
        <div style={styles.errorRow}>
          <Text style={styles.errorLabel}>Next Retry:</Text>
          <Text style={styles.errorValue}>{retryDate}</Text>
        </div>
      </Section>

      <Text style={styles.paragraph}>
        Please update your payment method to continue enjoying unlimited access to all PRO features.
      </Text>

      {/* Action Steps */}
      <Section style={styles.stepsBox}>
        <Text style={styles.stepsTitle}>What to do now:</Text>
        <ol style={styles.orderedList}>
          <li style={styles.orderedListItem}>
            Click the button below to update your payment method
          </li>
          <li style={styles.orderedListItem}>
            Verify your billing information is correct
          </li>
          <li style={styles.orderedListItem}>
            Ensure your card has sufficient funds
          </li>
        </ol>
      </Section>

      <Button href={updatePaymentUrl} color="red">
        Update Payment Method
      </Button>

      {/* What Happens Next */}
      <Section style={styles.infoBox}>
        <Text style={styles.infoTitle}>What happens next?</Text>
        <Text style={styles.infoText}>
          We'll automatically retry your payment on <strong>{retryDate}</strong>. If payment continues
          to fail, your PRO subscription may be canceled and you'll be downgraded to the FREE tier.
        </Text>
      </Section>

      <Text style={styles.footer}>
        Questions or need help? Reply to this email and we'll assist you right away.
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
  errorBox: {
    backgroundColor: '#fef2f2',
    border: '2px solid #ef4444',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '24px',
  },
  errorTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: '16px',
  },
  errorRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  errorLabel: {
    fontSize: '14px',
    color: '#7f1d1d',
    margin: '0',
  },
  errorValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#991b1b',
    margin: '0',
  },
  stepsBox: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fbbf24',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
  },
  stepsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#92400e',
    marginBottom: '12px',
  },
  orderedList: {
    margin: '0',
    padding: '0 0 0 24px',
  },
  orderedListItem: {
    fontSize: '14px',
    color: '#78350f',
    marginBottom: '8px',
    lineHeight: '20px',
  },
  infoBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '24px',
  },
  infoTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '8px',
  },
  infoText: {
    fontSize: '14px',
    color: '#4b5563',
    margin: '0',
    lineHeight: '20px',
  },
  footer: {
    fontSize: '14px',
    color: '#6b7280',
    textAlign: 'center' as const,
    marginTop: '24px',
  },
};
