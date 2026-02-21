/**
 * Limit Warning Email Template
 *
 * Sent when user reaches 80% of their tier limit
 * Encourages upgrade to PRO for unlimited access
 */

import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/Layout';
import { Button } from './components/Button';

interface LimitWarningEmailProps {
  userName: string;
  limitType: 'job searches' | 'applications' | 'resumes' | 'cover letters';
  current: number;
  limit: number;
  upgradeUrl: string;
}

export function LimitWarningEmail({
  userName,
  limitType,
  current,
  limit,
  upgradeUrl,
}: LimitWarningEmailProps) {
  const percentage = Math.round((current / limit) * 100);
  const remaining = limit - current;

  return (
    <EmailLayout previewText={`You've used ${percentage}% of your ${limitType} limit`}>
      <Text style={styles.greeting}>Hi {userName},</Text>

      <Text style={styles.paragraph}>
        You're approaching your monthly limit for <strong>{limitType}</strong>.
      </Text>

      {/* Usage Stats */}
      <Section style={styles.statsBox}>
        <Text style={styles.statsText}>
          <strong>Usage:</strong> {current} of {limit} ({percentage}%)
        </Text>
        <Text style={styles.statsText}>
          <strong>Remaining:</strong> {remaining} {limitType}
        </Text>

        {/* Progress Bar */}
        <div style={styles.progressBarContainer}>
          <div style={{ ...styles.progressBar, width: `${percentage}%` }} />
        </div>
      </Section>

      <Text style={styles.paragraph}>
        Don't let limits slow down your job search! Upgrade to <strong>PRO</strong> for unlimited
        access to all features.
      </Text>

      {/* PRO Benefits */}
      <Section style={styles.benefitsBox}>
        <Text style={styles.benefitsTitle}>PRO Benefits:</Text>
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
  statsBox: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fbbf24',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  statsText: {
    fontSize: '14px',
    color: '#92400e',
    margin: '4px 0',
  },
  progressBarContainer: {
    width: '100%',
    height: '12px',
    backgroundColor: '#fde68a',
    borderRadius: '6px',
    overflow: 'hidden',
    marginTop: '12px',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#f59e0b',
    transition: 'width 0.3s ease',
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
