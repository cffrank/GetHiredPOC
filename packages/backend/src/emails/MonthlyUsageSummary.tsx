/**
 * Monthly Usage Summary Email Template
 *
 * Sent at the end of each month with usage statistics
 * Provides insights and encourages continued engagement
 */

import { Text, Section, Hr } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/Layout';
import { Button } from './components/Button';

interface MonthlyUsageSummaryProps {
  userName: string;
  month: string;
  tier: 'free' | 'pro';
  usage: {
    jobSearches: number;
    jobsImported: number;
    applications: number;
    resumesGenerated: number;
    coverLettersGenerated: number;
  };
  dashboardUrl: string;
  upgradeUrl?: string;
}

export function MonthlyUsageSummary({
  userName,
  month,
  tier,
  usage,
  dashboardUrl,
  upgradeUrl,
}: MonthlyUsageSummaryProps) {
  const total =
    usage.jobSearches +
    usage.applications +
    usage.resumesGenerated +
    usage.coverLettersGenerated;

  return (
    <EmailLayout previewText={`Your ${month} usage summary`}>
      <Text style={styles.greeting}>Hi {userName},</Text>

      <Text style={styles.paragraph}>
        Here's a summary of your GetHiredPOC activity for <strong>{month}</strong>. Great job
        staying active in your job search!
      </Text>

      {/* Tier Badge */}
      <Section style={tier === 'pro' ? styles.proBadgeBox : styles.freeBadgeBox}>
        <Text style={styles.badgeText}>
          {tier === 'pro' ? '⭐ PRO' : '🆓 FREE'} Tier
        </Text>
      </Section>

      {/* Usage Stats */}
      <Section style={styles.statsBox}>
        <Text style={styles.statsTitle}>Your Activity in {month}</Text>

        <div style={styles.statRow}>
          <div style={styles.statIcon}>🔍</div>
          <div style={styles.statContent}>
            <Text style={styles.statValue}>{usage.jobSearches}</Text>
            <Text style={styles.statLabel}>Job Searches</Text>
          </div>
        </div>

        <Hr style={styles.statDivider} />

        <div style={styles.statRow}>
          <div style={styles.statIcon}>💼</div>
          <div style={styles.statContent}>
            <Text style={styles.statValue}>{usage.jobsImported}</Text>
            <Text style={styles.statLabel}>Jobs Imported</Text>
          </div>
        </div>

        <Hr style={styles.statDivider} />

        <div style={styles.statRow}>
          <div style={styles.statIcon}>📝</div>
          <div style={styles.statContent}>
            <Text style={styles.statValue}>{usage.applications}</Text>
            <Text style={styles.statLabel}>Applications Tracked</Text>
          </div>
        </div>

        <Hr style={styles.statDivider} />

        <div style={styles.statRow}>
          <div style={styles.statIcon}>📄</div>
          <div style={styles.statContent}>
            <Text style={styles.statValue}>{usage.resumesGenerated}</Text>
            <Text style={styles.statLabel}>Resumes Generated</Text>
          </div>
        </div>

        <Hr style={styles.statDivider} />

        <div style={styles.statRow}>
          <div style={styles.statIcon}>✉️</div>
          <div style={styles.statContent}>
            <Text style={styles.statValue}>{usage.coverLettersGenerated}</Text>
            <Text style={styles.statLabel}>Cover Letters Generated</Text>
          </div>
        </div>

        <Hr style={styles.statDivider} />

        <div style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Actions:</Text>
          <Text style={styles.totalValue}>{total}</Text>
        </div>
      </Section>

      {/* Insights */}
      <Section style={styles.insightsBox}>
        <Text style={styles.insightsTitle}>💡 Keep up the momentum!</Text>
        <Text style={styles.insightsText}>
          {total > 50
            ? "Wow! You've been very active this month. Keep it up!"
            : total > 20
            ? "You're making good progress on your job search!"
            : "Stay consistent! A little progress each day adds up."}
        </Text>
      </Section>

      {/* Upgrade CTA for FREE users */}
      {tier === 'free' && upgradeUrl && (
        <Section style={styles.upgradeBox}>
          <Text style={styles.upgradeTitle}>🚀 Want to do more?</Text>
          <Text style={styles.upgradeText}>
            Upgrade to PRO for unlimited job searches, applications, and AI-generated content.
          </Text>
          <Button href={upgradeUrl} color="green">
            Upgrade to PRO - $39/month
          </Button>
        </Section>
      )}

      <Button href={dashboardUrl}>
        View Dashboard
      </Button>

      <Text style={styles.footer}>
        Thanks for using GetHiredPOC. Here's to landing your dream job!
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
  proBadgeBox: {
    backgroundColor: '#ecfdf5',
    border: '2px solid #10b981',
    borderRadius: '8px',
    padding: '12px',
    textAlign: 'center' as const,
    marginBottom: '24px',
  },
  freeBadgeBox: {
    backgroundColor: '#eff6ff',
    border: '2px solid #3b82f6',
    borderRadius: '8px',
    padding: '12px',
    textAlign: 'center' as const,
    marginBottom: '24px',
  },
  badgeText: {
    fontSize: '16px',
    fontWeight: '600',
    margin: '0',
  },
  statsBox: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '24px',
  },
  statsTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '20px',
    textAlign: 'center' as const,
  },
  statRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 0',
  },
  statIcon: {
    fontSize: '24px',
    marginRight: '16px',
  },
  statContent: {
    flex: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statValue: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#111827',
    margin: '0',
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0',
  },
  statDivider: {
    borderColor: '#e5e7eb',
    margin: '8px 0',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
  },
  totalLabel: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    margin: '0',
  },
  totalValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#3b82f6',
    margin: '0',
  },
  insightsBox: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fbbf24',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
  },
  insightsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#92400e',
    marginBottom: '8px',
  },
  insightsText: {
    fontSize: '14px',
    color: '#78350f',
    margin: '0',
  },
  upgradeBox: {
    backgroundColor: '#ecfdf5',
    border: '2px solid #10b981',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '24px',
    textAlign: 'center' as const,
  },
  upgradeTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#065f46',
    marginBottom: '8px',
  },
  upgradeText: {
    fontSize: '14px',
    color: '#047857',
    marginBottom: '16px',
  },
  footer: {
    fontSize: '14px',
    color: '#6b7280',
    textAlign: 'center' as const,
    marginTop: '24px',
  },
};
