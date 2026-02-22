/**
 * Limit Reached Email Template
 *
 * Sent when user hits 100% of their tier limit
 * Strongly encourages upgrade to continue using the service
 */

import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/Layout';
import { Button } from './components/Button';

interface LimitReachedEmailProps {
  userName: string;
  limitType: 'job searches' | 'applications' | 'resumes' | 'cover letters';
  limit: number;
  upgradeUrl: string;
  resetDate?: string;
}

export function LimitReachedEmail({
  userName,
  limitType,
  limit,
  upgradeUrl,
  resetDate,
}: LimitReachedEmailProps) {
  return (
    <EmailLayout previewText={`You've reached your ${limitType} limit`}>
      <Text style={styles.greeting}>Hi {userName},</Text>

      <Text style={styles.paragraph}>
        You've reached your monthly limit for <strong>{limitType}</strong>.
      </Text>

      {/* Alert Box */}
      <Section style={styles.alertBox}>
        <Text style={styles.alertTitle}>⚠️ Limit Reached</Text>
        <Text style={styles.alertText}>
          You've used all {limit} of your {limitType} for this month.
        </Text>
        {resetDate && (
          <Text style={styles.alertText}>
            Your limit will reset on <strong>{resetDate}</strong>.
          </Text>
        )}
      </Section>

      <Text style={styles.paragraph}>
        Don't let this slow down your job search momentum! Upgrade to <strong>PRO</strong> today for
        unlimited access.
      </Text>

      {/* PRO Benefits */}
      <Section style={styles.proBox}>
        <Text style={styles.proTitle}>🚀 Upgrade to PRO</Text>
        <ul style={styles.list}>
          <li style={styles.listItem}>✓ <strong>Unlimited</strong> job searches per day</li>
          <li style={styles.listItem}>✓ <strong>Unlimited</strong> job applications</li>
          <li style={styles.listItem}>✓ <strong>Unlimited</strong> AI-generated resumes</li>
          <li style={styles.listItem}>✓ <strong>Unlimited</strong> cover letters</li>
          <li style={styles.listItem}>✓ Priority customer support</li>
          <li style={styles.listItem}>✓ Advanced analytics</li>
        </ul>
        <Text style={styles.price}>Just $39/month • Cancel anytime</Text>
      </Section>

      <Button href={upgradeUrl} color="green">
        Upgrade to PRO Now
      </Button>

      <Text style={styles.footer}>
        Questions about PRO? Reply to this email anytime!
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
  alertBox: {
    backgroundColor: '#fef2f2',
    border: '2px solid #ef4444',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '24px',
  },
  alertTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: '8px',
  },
  alertText: {
    fontSize: '14px',
    color: '#7f1d1d',
    margin: '4px 0',
  },
  proBox: {
    backgroundColor: '#ecfdf5',
    border: '2px solid #10b981',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '16px',
  },
  proTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#065f46',
    marginBottom: '12px',
  },
  list: {
    margin: '0',
    padding: '0 0 0 20px',
  },
  listItem: {
    fontSize: '15px',
    color: '#047857',
    marginBottom: '8px',
    lineHeight: '22px',
  },
  price: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#059669',
    marginTop: '16px',
    marginBottom: '0',
  },
  footer: {
    fontSize: '14px',
    color: '#6b7280',
    textAlign: 'center' as const,
    marginTop: '24px',
  },
};
