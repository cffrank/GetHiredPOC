import { Hono } from 'hono';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { LimitWarningEmail } from './emails/LimitWarningEmail';
import { LimitReachedEmail } from './emails/LimitReachedEmail';
import { PaymentSuccessEmail } from './emails/PaymentSuccessEmail';
import { PaymentFailedEmail } from './emails/PaymentFailedEmail';
import { MonthlyUsageSummary } from './emails/MonthlyUsageSummary';
import { TrialWarningEmail } from './emails/TrialWarningEmail';
import { TrialFinalWarningEmail } from './emails/TrialFinalWarningEmail';
import { TrialExpiredEmail } from './emails/TrialExpiredEmail';

const app = new Hono();

interface SendRequest {
  type: string;
  payload: Record<string, any>;
  apiKey: string;
}

const FROM = 'GetHiredPOC <noreply@gethiredpoc.com>';

async function renderEmail(type: string, payload: Record<string, any>): Promise<{ html: string; subject: string }> {
  switch (type) {
    case 'welcome': {
      const { userName, userEmail } = payload;
      return {
        subject: 'Welcome to GetHired POC!',
        html: `
          <h2>Welcome to GetHired POC!</h2>
          <p>Hi ${userName || 'there'},</p>
          <p>We're excited to help you in your job search journey.</p>
          <h3>Get started by:</h3>
          <ol>
            <li>Uploading your resume</li>
            <li>Browsing available jobs</li>
            <li>Tracking your applications</li>
          </ol>
          <p>Best of luck!<br>The GetHired Team</p>
        `,
      };
    }

    case 'status_update': {
      const { jobTitle, company, newStatus } = payload;
      const statusMessages: Record<string, string> = {
        'applied': 'Your application has been submitted',
        'phone_screen': 'You have a phone screen scheduled',
        'interview': 'You have an interview scheduled',
        'offer': 'Congratulations! You received an offer',
        'rejected': 'Application status updated',
      };
      const message = statusMessages[newStatus] || 'Application status updated';
      const subject = `${message} - ${jobTitle} at ${company}`;
      return {
        subject,
        html: `
          <h2>${message}</h2>
          <p><strong>Job:</strong> ${jobTitle}</p>
          <p><strong>Company:</strong> ${company}</p>
          <p><strong>New Status:</strong> ${newStatus}</p>
          <p>Good luck!<br>The GetHired Team</p>
        `,
      };
    }

    case 'limit_warning': {
      const { userName, limitType, current, limit, upgradeUrl } = payload;
      const percentage = Math.round((current / limit) * 100);
      return {
        subject: `You've used ${percentage}% of your ${limitType} limit`,
        html: await render(
          LimitWarningEmail({ userName, limitType, current, limit, upgradeUrl })
        ),
      };
    }

    case 'limit_reached': {
      const { userName, limitType, limit, upgradeUrl, resetDate } = payload;
      return {
        subject: `You've reached your ${limitType} limit`,
        html: await render(
          LimitReachedEmail({ userName, limitType, limit, upgradeUrl, resetDate })
        ),
      };
    }

    case 'payment_success': {
      const { userName, amount, subscriptionId, startDate, nextBillingDate, dashboardUrl } = payload;
      return {
        subject: 'Thank you for upgrading to PRO!',
        html: await render(
          PaymentSuccessEmail({ userName, amount, subscriptionId, startDate, nextBillingDate, dashboardUrl })
        ),
      };
    }

    case 'payment_failed': {
      const { userName, amount, failureReason, retryDate, updatePaymentUrl } = payload;
      return {
        subject: 'Action required: Payment failed',
        html: await render(
          PaymentFailedEmail({ userName, amount, failureReason, retryDate, updatePaymentUrl })
        ),
      };
    }

    case 'monthly_summary': {
      const { userName, month, tier, usage, dashboardUrl, upgradeUrl } = payload;
      return {
        subject: `Your ${month} usage summary`,
        html: await render(
          MonthlyUsageSummary({ userName, month, tier, usage, dashboardUrl, upgradeUrl })
        ),
      };
    }

    case 'trial_warning': {
      const { userName, daysRemaining, upgradeUrl } = payload;
      return {
        subject: `Your PRO trial expires in ${daysRemaining} days`,
        html: await render(
          TrialWarningEmail({ userName, daysRemaining, upgradeUrl })
        ),
      };
    }

    case 'trial_final_warning': {
      const { userName, upgradeUrl } = payload;
      return {
        subject: 'Your PRO trial expires tomorrow!',
        html: await render(
          TrialFinalWarningEmail({ userName, upgradeUrl })
        ),
      };
    }

    case 'trial_expired': {
      const { userName, upgradeUrl } = payload;
      return {
        subject: 'Your PRO trial has ended',
        html: await render(
          TrialExpiredEmail({ userName, upgradeUrl })
        ),
      };
    }

    case 'raw': {
      const { subject, html } = payload;
      return { subject, html };
    }

    default:
      throw new Error(`Unknown email type: ${type}`);
  }
}

app.post('/send', async (c) => {
  try {
    const body = await c.req.json<SendRequest>();
    const { type, payload, apiKey } = body;

    if (!apiKey) {
      return c.json({ error: 'Missing API key' }, 400);
    }
    if (!type || !payload) {
      return c.json({ error: 'Missing type or payload' }, 400);
    }

    const to = payload.to as string;
    if (!to) {
      return c.json({ error: 'Missing payload.to' }, 400);
    }

    const { html, subject } = await renderEmail(type, payload);

    const resend = new Resend(apiKey);
    await resend.emails.send({ from: FROM, to, subject, html });

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Email worker error:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
