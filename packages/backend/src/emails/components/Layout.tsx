/**
 * Email Layout Component
 *
 * Base layout wrapper for all email templates
 * Provides consistent header, footer, and styling
 */

import { Html, Head, Body, Container, Section, Text, Link, Hr } from '@react-email/components';
import * as React from 'react';

interface EmailLayoutProps {
  children: React.ReactNode;
  previewText?: string;
}

export function EmailLayout({ children, previewText }: EmailLayoutProps) {
  return (
    <Html>
      <Head>
        {previewText && <meta name="preview" content={previewText} />}
      </Head>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            <Text style={styles.logo}>GetHiredPOC</Text>
            <Text style={styles.tagline}>Your AI-Powered Job Search Assistant</Text>
          </Section>

          {/* Main Content */}
          <Section style={styles.content}>{children}</Section>

          {/* Footer */}
          <Hr style={styles.hr} />
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              GetHiredPOC • AI-Powered Job Search
            </Text>
            <Text style={styles.footerText}>
              <Link href="https://gethiredpoc.pages.dev/subscription" style={styles.link}>
                Manage Subscription
              </Link>
              {' • '}
              <Link href="https://gethiredpoc.pages.dev/profile" style={styles.link}>
                Email Preferences
              </Link>
            </Text>
            <Text style={styles.footerText}>
              This email was sent to you because you have an account with GetHiredPOC.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: '#f6f9fc',
    fontFamily:
      '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  },
  container: {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0 48px',
    marginBottom: '64px',
    maxWidth: '600px',
  },
  header: {
    padding: '32px 20px',
    textAlign: 'center' as const,
    backgroundColor: '#3b82f6',
  },
  logo: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#ffffff',
    margin: '0 0 8px 0',
  },
  tagline: {
    fontSize: '14px',
    color: '#dbeafe',
    margin: '0',
  },
  content: {
    padding: '20px',
  },
  hr: {
    borderColor: '#e5e7eb',
    margin: '20px 0',
  },
  footer: {
    padding: '0 20px',
  },
  footerText: {
    color: '#6b7280',
    fontSize: '12px',
    lineHeight: '20px',
    textAlign: 'center' as const,
    margin: '4px 0',
  },
  link: {
    color: '#3b82f6',
    textDecoration: 'underline',
  },
};
