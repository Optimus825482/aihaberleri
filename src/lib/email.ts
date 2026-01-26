/**
 * Email Service
 *
 * Production-ready email service using Resend API
 * Features:
 * - Newsletter sending (bulk email)
 * - Welcome email (new subscriber)
 * - Unsubscribe confirmation
 * - HTML template support
 * - Automatic unsubscribe link
 * - Rate limiting
 * - Error handling & retry logic
 */

import { z } from "zod";

// Environment validation
const emailEnvSchema = z.object({
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SITE_NAME: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().email().optional(),
});

const env = emailEnvSchema.parse({
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
});

// Email configuration
const EMAIL_CONFIG = {
  from:
    env.RESEND_FROM_EMAIL ||
    `${env.NEXT_PUBLIC_SITE_NAME} <onboarding@resend.dev>`,
  replyTo: env.RESEND_FROM_EMAIL || "info@aihaberleri.org",
  apiUrl: "https://api.resend.com/emails",
  batchSize: 100, // Resend batch limit
  rateLimitDelay: 1000, // 1 second between batches
};

// Types
export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

export interface NewsletterEmailData {
  subject: string;
  content: string;
  preheader?: string;
}

export interface WelcomeEmailData {
  email: string;
  frequency: string;
}

export interface UnsubscribeEmailData {
  email: string;
}

// Resend API client
class ResendClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async send(options: EmailOptions): Promise<{ id: string; success: boolean }> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: EMAIL_CONFIG.from,
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
          reply_to: options.replyTo || EMAIL_CONFIG.replyTo,
          tags: options.tags,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Resend API error: ${error.message || response.statusText}`,
        );
      }

      const data = await response.json();
      return { id: data.id, success: true };
    } catch (error) {
      console.error("Email send error:", error);
      throw error;
    }
  }

  async sendBatch(
    emails: EmailOptions[],
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process in batches with rate limiting (2 emails/second for free plan)
    const RATE_LIMIT_DELAY = 600; // 600ms between emails (safe margin)

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];

      try {
        await this.send(email);
        results.sent++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `${email.to}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }

      // Rate limiting: wait between emails
      if (i < emails.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
    }

    return results;
  }
}

// Initialize client
const resendClient = new ResendClient(env.RESEND_API_KEY, EMAIL_CONFIG.apiUrl);

// Email Templates
export const emailTemplates = {
  /**
   * Base HTML template wrapper
   */
  base: (content: string, preheader?: string) => `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${env.NEXT_PUBLIC_SITE_NAME}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      padding: 40px 30px;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
      border-top: 1px solid #e9ecef;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      opacity: 0.9;
    }
    .divider {
      border: 0;
      border-top: 1px solid #e9ecef;
      margin: 30px 0;
    }
    .preheader {
      display: none;
      max-height: 0;
      overflow: hidden;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 20px 15px;
      }
      .header h1 {
        font-size: 24px;
      }
    }
  </style>
</head>
<body>
  ${preheader ? `<div class="preheader">${preheader}</div>` : ""}
  <div class="container">
    <div class="header">
      <h1>🤖 ${env.NEXT_PUBLIC_SITE_NAME}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p><strong>${env.NEXT_PUBLIC_SITE_NAME}</strong></p>
      <p>Yapay Zeka Dünyasındaki Son Gelişmeler</p>
      <p>
        <a href="${env.NEXT_PUBLIC_SITE_URL}" style="color: #667eea; text-decoration: none;">Web Sitesi</a> •
        <a href="${env.NEXT_PUBLIC_SITE_URL}/about" style="color: #667eea; text-decoration: none;">Hakkımızda</a> •
        <a href="${env.NEXT_PUBLIC_SITE_URL}/privacy" style="color: #667eea; text-decoration: none;">Gizlilik</a>
      </p>
      <p style="margin-top: 20px;">
        <a href="{{unsubscribe_url}}" style="color: #6c757d; text-decoration: underline;">Abonelikten Çık</a>
      </p>
      <p style="margin-top: 10px; color: #adb5bd;">
        © ${new Date().getFullYear()} ${env.NEXT_PUBLIC_SITE_NAME}. Tüm hakları saklıdır.
      </p>
    </div>
  </div>
</body>
</html>
  `,

  /**
   * Newsletter template
   */
  newsletter: (data: NewsletterEmailData, unsubscribeUrl: string) => {
    const content = `
      <h2 style="color: #333; margin-top: 0;">${data.subject}</h2>
      <div style="color: #555; line-height: 1.8;">
        ${data.content}
      </div>
      <hr class="divider">
      <p style="text-align: center; color: #6c757d; font-size: 14px;">
        Bu e-postayı almak istemiyorsanız, 
        <a href="${unsubscribeUrl}" style="color: #667eea;">abonelikten çıkabilirsiniz</a>.
      </p>
    `;
    return emailTemplates
      .base(content, data.preheader)
      .replace("{{unsubscribe_url}}", unsubscribeUrl);
  },

  /**
   * Welcome email template
   */
  welcome: (data: WelcomeEmailData, unsubscribeUrl: string) => {
    const frequencyText =
      {
        REALTIME: "gerçek zamanlı",
        DAILY: "günlük",
        WEEKLY: "haftalık",
        MONTHLY: "aylık",
      }[data.frequency] || "günlük";

    const content = `
      <h2 style="color: #333; margin-top: 0;">Hoş Geldiniz! 🎉</h2>
      <p style="font-size: 16px; color: #555;">
        <strong>${env.NEXT_PUBLIC_SITE_NAME}</strong> bültenine abone olduğunuz için teşekkür ederiz!
      </p>
      <p style="color: #555;">
        Artık yapay zeka dünyasındaki en önemli gelişmeleri <strong>${frequencyText}</strong> olarak 
        e-posta kutunuzda bulacaksınız.
      </p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <h3 style="margin-top: 0; color: #333;">📬 Ne Bekleyebilirsiniz?</h3>
        <ul style="color: #555; padding-left: 20px;">
          <li>En son AI haberleri ve gelişmeleri</li>
          <li>Teknoloji trendleri ve analizler</li>
          <li>Uzman görüşleri ve yorumlar</li>
          <li>Özel içerikler ve kaynaklar</li>
        </ul>
      </div>
      <div style="text-align: center; margin: 40px 0;">
        <a href="${env.NEXT_PUBLIC_SITE_URL}" class="button">
          Web Sitesini Ziyaret Et
        </a>
      </div>
      <p style="color: #6c757d; font-size: 14px; text-align: center;">
        Abonelik tercihlerinizi değiştirmek veya abonelikten çıkmak için 
        <a href="${unsubscribeUrl}" style="color: #667eea;">buraya tıklayın</a>.
      </p>
    `;
    return emailTemplates
      .base(
        content,
        "Hoş geldiniz! AI Haberleri bültenine başarıyla abone oldunuz.",
      )
      .replace("{{unsubscribe_url}}", unsubscribeUrl);
  },

  /**
   * Unsubscribe confirmation template
   */
  unsubscribeConfirmation: (data: UnsubscribeEmailData) => {
    const content = `
      <h2 style="color: #333; margin-top: 0;">Abonelik İptal Edildi</h2>
      <p style="font-size: 16px; color: #555;">
        <strong>${data.email}</strong> adresli e-posta bültenimizden çıkarıldı.
      </p>
      <p style="color: #555;">
        Artık bizden e-posta almayacaksınız. Kararınıza saygı duyuyoruz.
      </p>
      <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #ffc107;">
        <p style="margin: 0; color: #856404;">
          <strong>💡 Fikrinizi değiştirirseniz</strong><br>
          İstediğiniz zaman web sitemizden tekrar abone olabilirsiniz.
        </p>
      </div>
      <div style="text-align: center; margin: 40px 0;">
        <a href="${env.NEXT_PUBLIC_SITE_URL}" class="button">
          Web Sitesine Dön
        </a>
      </div>
      <p style="color: #6c757d; font-size: 14px; text-align: center;">
        Geri bildirimleriniz bizim için değerlidir. 
        <a href="mailto:${EMAIL_CONFIG.replyTo}" style="color: #667eea;">Bize ulaşın</a>.
      </p>
    `;
    return emailTemplates
      .base(content, "Aboneliğiniz başarıyla iptal edildi.")
      .replace("{{unsubscribe_url}}", "#");
  },

  /**
   * Agent run report template
   */
  agentReport: (data: {
    status: string;
    articlesCreated: number;
    articlesScraped: number;
    duration: number;
    errors: string[];
    publishedArticles: Array<{ title: string; slug: string }>;
  }) => {
    const statusColor = data.status === "SUCCESS" ? "#10b981" : "#ef4444";
    const articlesHtml = data.publishedArticles
      .map(
        (a) =>
          `<li><a href="${env.NEXT_PUBLIC_SITE_URL}/news/${a.slug}">${a.title}</a></li>`,
      )
      .join("");

    const content = `
      <h2 style="color: #333; margin-top: 0;">🤖 Agent Çalışma Raporu</h2>
      <div style="padding: 15px; border-radius: 8px; background-color: ${statusColor}10; border-left: 4px solid ${statusColor}; margin-bottom: 20px;">
        <strong>Durum:</strong> <span style="color: ${statusColor}">${data.status}</span><br>
        <strong>Oluşturulan Haber:</strong> ${data.articlesCreated}<br>
        <strong>Taranan Haber:</strong> ${data.articlesScraped}<br>
        <strong>Süre:</strong> ${data.duration}s
      </div>

      ${
        data.publishedArticles.length > 0
          ? `
        <h3>✅ Yayınlanan Haberler:</h3>
        <ul>${articlesHtml}</ul>
      `
          : ""
      }

      ${
        data.errors.length > 0
          ? `
        <h3 style="color: #ef4444;">❌ Hatalar:</h3>
        <ul style="color: #666; font-size: 14px;">
          ${data.errors.map((e) => `<li>${e}</li>`).join("")}
        </ul>
      `
          : ""
      }

      <div style="text-align: center; margin-top: 30px;">
        <a href="${env.NEXT_PUBLIC_SITE_URL}/admin" class="button">Admin Paneline Git</a>
      </div>
    `;
    return emailTemplates
      .base(
        content,
        `Agent Çalışması: ${data.status} - ${data.articlesCreated} haber yayınlandı.`,
      )
      .replace("{{unsubscribe_url}}", "#");
  },
};

// Email Service Functions
export const emailService = {
  /**
   * Send a single email
   */
  async send(
    options: EmailOptions,
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const result = await resendClient.send(options);
      return { success: true, id: result.id };
    } catch (error) {
      console.error("Email send error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  /**
   * Send newsletter to multiple recipients
   */
  async sendNewsletter(
    recipients: Array<{ email: string; token: string }>,
    data: NewsletterEmailData,
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    const emails: EmailOptions[] = recipients.map((recipient) => {
      const unsubscribeUrl = `${env.NEXT_PUBLIC_SITE_URL}/api/newsletter/unsubscribe?token=${recipient.token}`;

      return {
        to: recipient.email,
        subject: data.subject,
        html: emailTemplates.newsletter(data, unsubscribeUrl),
        tags: [
          { name: "type", value: "newsletter" },
          { name: "campaign", value: new Date().toISOString().split("T")[0] },
        ],
      };
    });

    return resendClient.sendBatch(emails);
  },

  /**
   * Send welcome email to new subscriber
   */
  async sendWelcomeEmail(
    email: string,
    token: string,
    frequency: string,
  ): Promise<{ success: boolean; error?: string }> {
    const unsubscribeUrl = `${env.NEXT_PUBLIC_SITE_URL}/api/newsletter/unsubscribe?token=${token}`;

    return this.send({
      to: email,
      subject: `Hoş Geldiniz - ${env.NEXT_PUBLIC_SITE_NAME}`,
      html: emailTemplates.welcome({ email, frequency }, unsubscribeUrl),
      tags: [{ name: "type", value: "welcome" }],
    });
  },

  /**
   * Send unsubscribe confirmation email
   */
  async sendUnsubscribeConfirmation(
    email: string,
  ): Promise<{ success: boolean; error?: string }> {
    return this.send({
      to: email,
      subject: `Abonelik İptal Edildi - ${env.NEXT_PUBLIC_SITE_NAME}`,
      html: emailTemplates.unsubscribeConfirmation({ email }),
      tags: [{ name: "type", value: "unsubscribe" }],
    });
  },

  /**
   * Send agent execution report to admin
   */
  async sendAgentReport(
    email: string,
    data: {
      status: string;
      articlesCreated: number;
      articlesScraped: number;
      duration: number;
      errors: string[];
      publishedArticles: Array<{ title: string; slug: string }>;
    },
  ): Promise<{ success: boolean; error?: string }> {
    return this.send({
      to: email,
      subject: `🤖 Agent Raporu: ${data.status} (${data.articlesCreated} Haber)`,
      html: emailTemplates.agentReport(data),
      tags: [{ name: "type", value: "agent-report" }],
    });
  },

  /**
   * Test email configuration
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.send({
        to: EMAIL_CONFIG.replyTo,
        subject: "Test Email - Email Service Configuration",
        html: emailTemplates.base(`
          <h2>Email Service Test</h2>
          <p>This is a test email to verify your email configuration.</p>
          <p><strong>Configuration:</strong></p>
          <ul>
            <li>From: ${EMAIL_CONFIG.from}</li>
            <li>Reply To: ${EMAIL_CONFIG.replyTo}</li>
            <li>Site: ${env.NEXT_PUBLIC_SITE_URL}</li>
          </ul>
          <p style="color: green;">✅ If you received this email, your configuration is working correctly!</p>
        `),
        tags: [{ name: "type", value: "test" }],
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

export default emailService;
