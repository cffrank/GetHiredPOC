/**
 * Trial Expired Email Template
 *
 * Sent when trial has expired and user has been downgraded to FREE
 * Encourages user to upgrade to paid PRO subscription
 */

import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/Layout';
import { Button } from './components/Button';

interface TrialExpiredEmailProps {
  userName: string;
  upgradeUrl: string;
}

export function TrialExpiredEmail({
  userName,
  upgradeUrl,
}: TrialExpiredEmailProps) {
  return (
    <EmailLayout previewText="Your PRO trial has ended">
      <Text style={styles.greeting}>Hi {userName},</Text>

      <Text style={styles.paragraph}>
        Your <strong>14-day PRO trial</strong> has ended and you've been moved to the FREE tier.
      </Text>

      {/* Free Tier Limits */}
      <Section style={styles.limitsBox}>
        <Text style={styles.limitsTitle}>Your FREE tier limits:</Text>
        <ul style={styles.list}>
          <li style={styles.listItem}>3 job searches per day</li>
          <li style={styles.listItem}>10 applications per month</li>
          <li style={styles.listItem}>5 AI-generated resumes per month</li>
          <li style={styles.listItem}>10 cover letters per month</li>
        </ul>
      </Section>

      <Text style={styles.paragraph}>
        You can continue using GetHiredPOC with these limits, or upgrade to <strong>PRO</strong> to
        unlock unlimited access again!
      </Text>

      {/* PRO Benefits */}
      <Section style={styles.benefitsBox}>
        <Text style={styles.benefitsTitle}>Upgrade to PRO and get:</Text>
        <ul style={styles.list}>
          <li style={styles.listItem}>✓ Unlimited job searches</li>
          <li style={styles.listItem}>✓ Unlimited applications</li>
          <li style={styles.listItem}>✓ Unlimited AI-generated resumes</li>
          <li style={styles.listItem}>✓ Unlimited cover letters</li>
          <li style={styles.listItem}>✓ Priority support</li>
        </ul>
        <Text style={styles.price}>Only $39/month - Cancel anytime</Text>
      </Section>

      <Button href={upgradeUrl} color="green">
        Upgrade to PRO Now
      </Button>

      <Text style={styles.thankYou}>
        Thank you for trying GetHiredPOC PRO! We hope it helped accelerate your job search.
      </Text>

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
  limitsBox: {
    backgroundColor: '#f3f4f6',
    border: '1px solid #9ca3af',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  limitsTitle: {
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
    color: '#374151',
    marginBottom: '4px',
  },
  price: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#059669',
    marginTop: '12px',
    marginBottom: '0',
  },
  thankYou: {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#6b7280',
    textAlign: 'center' as const,
    marginTop: '24px',
    marginBottom: '8px',
  },
  footer: {
    fontSize: '14px',
    color: '#6b7280',
    textAlign: 'center' as const,
    marginTop: '8px',
  },
};
