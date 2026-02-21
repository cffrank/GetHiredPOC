/**
 * Trial Warning Email Template
 *
 * Sent 7 days before trial expiry
 * Encourages user to upgrade to paid PRO subscription
 */

import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/Layout';
import { Button } from './components/Button';

interface TrialWarningEmailProps {
  userName: string;
  daysRemaining: number;
  upgradeUrl: string;
}

export function TrialWarningEmail({
  userName,
  daysRemaining,
  upgradeUrl,
}: TrialWarningEmailProps) {
  return (
    <EmailLayout previewText={`Your PRO trial expires in ${daysRemaining} days`}>
      <Text style={styles.greeting}>Hi {userName},</Text>

      <Text style={styles.paragraph}>
        Your <strong>14-day PRO trial</strong> is coming to an end soon!
      </Text>

      {/* Trial Info */}
      <Section style={styles.warningBox}>
        <Text style={styles.warningText}>
          <strong>Trial expires in: {daysRemaining} days</strong>
        </Text>
        <Text style={styles.warningSubtext}>
          After your trial ends, you'll be downgraded to the FREE tier with limited features.
        </Text>
      </Section>

      <Text style={styles.paragraph}>
        Continue enjoying unlimited access by upgrading to <strong>PRO</strong> today!
      </Text>

      {/* PRO Benefits */}
      <Section style={styles.benefitsBox}>
        <Text style={styles.benefitsTitle}>Keep Your PRO Benefits:</Text>
        <ul style={styles.list}>
          <li style={styles.listItem}>✓ Unlimited job searches</li>
          <li style={styles.listItem}>✓ Unlimited applications</li>
          <li style={styles.listItem}>✓ Unlimited AI-generated resumes</li>
          <li style={styles.listItem}>✓ Unlimited cover letters</li>
          <li style={styles.listItem}>✓ Priority support</li>
        </ul>
        <Text style={styles.price}>Only $39/month</Text>
      </Section>

      <Button href={upgradeUrl} color="green">
        Upgrade to PRO Now
      </Button>

      <Text style={styles.footer}>
        Questions? Reply to this email and we'll be happy to help!
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
  warningBox: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fbbf24',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  warningText: {
    fontSize: '16px',
    color: '#92400e',
    margin: '0 0 8px 0',
  },
  warningSubtext: {
    fontSize: '14px',
    color: '#92400e',
    margin: '0',
  },
  benefitsBox: {
    backgroundColor: '#ecfdf5',
    border: '1px solid #10b981',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  benefitsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#065f46',
    marginBottom: '8px',
  },
  list: {
    margin: '0',
    padding: '0 0 0 20px',
  },
  listItem: {
    fontSize: '14px',
    color: '#047857',
    marginBottom: '4px',
  },
  price: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#059669',
    marginTop: '12px',
    marginBottom: '0',
  },
  footer: {
    fontSize: '14px',
    color: '#6b7280',
    textAlign: 'center' as const,
    marginTop: '24px',
  },
};
