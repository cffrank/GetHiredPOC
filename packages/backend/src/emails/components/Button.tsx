/**
 * Email Button Component
 *
 * Reusable call-to-action button for emails
 */

import { Button as EmailButton } from '@react-email/components';
import * as React from 'react';

interface ButtonProps {
  href: string;
  children: React.ReactNode;
  color?: 'blue' | 'green' | 'red';
}

export function Button({ href, children, color = 'blue' }: ButtonProps) {
  const colorStyles = {
    blue: {
      backgroundColor: '#3b82f6',
      hoverBackgroundColor: '#2563eb',
    },
    green: {
      backgroundColor: '#10b981',
      hoverBackgroundColor: '#059669',
    },
    red: {
      backgroundColor: '#ef4444',
      hoverBackgroundColor: '#dc2626',
    },
  };

  const style = {
    ...styles.button,
    backgroundColor: colorStyles[color].backgroundColor,
  };

  return (
    <EmailButton href={href} style={style}>
      {children}
    </EmailButton>
  );
}

const styles = {
  button: {
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'block',
    padding: '12px 24px',
    margin: '16px 0',
  },
};
