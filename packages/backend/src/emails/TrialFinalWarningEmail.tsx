/**
 * Trial Final Warning Email Template
 *
 * Sent 1 day before trial expiry
 * Final urgent reminder to upgrade
 */

import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/Layout';
import { Button } from './components/Button';

interface TrialFinalWarningEmailProps {
  userName: string;
  upgradeUrl: string;
}

export function TrialFinalWarningEmail({
  userName,
  upgradeUrl,
}: TrialFinalWarningEmailProps) {
  return (
    <EmailLayout previewText="Your PRO trial expires tomorrow!">
      <Text style={styles.greeting}>Hi {userName},</Text>

      <Text style={styles.paragraph}>
        This is your <strong>final reminder</strong> that your PRO trial is ending soon!
      </Text>

      {/* Urgent Warning */}
      <Section style={styles.urgentBox}>
        <Text style={styles.urgentText}>
          ⚠️ <strong>Your trial expires in 24 hours</strong>
        </Text>
        <Text style={styles.urgentSubtext}>
          After tomorrow, you'll lose access to unlimited features and be downgraded to the FREE tier.
        </Text>
      </Section>

      <Text style={styles.paragraph}>
        Don't lose your momentum! Upgrade now to keep your unlimited access.
      </Text>

      {/* What You'll Lose */}
      <Section style={styles.lossBox}>
        <Text style={styles.lossTitle}>Without PRO, you'll be limited to:</Text>
        <ul style={styles.list}>
          <li style={styles.listItem}>✗ Only 3 job searches per day</li>
          <li style={styles.listItem}>✗ Only 10 applications per month</li>
          <li style={styles.listItem}>✗ Only 5 AI-generated resumes per month</li>
          <li style={styles.listItem}>✗ Only 10 cover letters per month</li>
        </ul>
      </Section>

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

      <Button href={upgradeUrl} color="red">
        Upgrade to PRO Now - Don't Wait!
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
  urgentBox: {
    backgroundColor: '#fee2e2',
    border: '2px solid #ef4444',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  urgentText: {
    fontSize: '18px',
    color: '#991b1b',
    margin: '0 0 8px 0',
  },
  urgentSubtext: {
    fontSize: '14px',
    color: '#991b1b',
    margin: '0',
  },
  lossBox: {
    backgroundColor: '#f3f4f6',
    border: '1px solid #9ca3af',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  lossTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: '8px',
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
