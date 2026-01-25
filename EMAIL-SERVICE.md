# 📧 Email Service Documentation

Production-ready email service for AI Haberleri using Resend API.

## 🎯 Features

- ✅ Newsletter sending (bulk email)
- ✅ Welcome email (new subscriber)
- ✅ Unsubscribe confirmation
- ✅ HTML template support
- ✅ Automatic unsubscribe link
- ✅ Rate limiting (spam prevention)
- ✅ Batch processing (100 emails per batch)
- ✅ Error handling & retry logic
- ✅ Email tracking with tags
- ✅ Test mode for development

## 🚀 Setup

### 1. Install Dependencies

Email service uses Resend API (no additional dependencies needed).

### 2. Get Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Create a new API key
3. Add to `.env`:

```bash
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxx"
RESEND_FROM_EMAIL="AI Haberleri <noreply@aihaberleri.org>"
```

### 3. Verify Domain (Production)

For production, verify your domain in Resend:

1. Go to Resend Dashboard → Domains
2. Add your domain (e.g., `aihaberleri.org`)
3. Add DNS records (SPF, DKIM, DMARC)
4. Wait for verification (usually 5-10 minutes)
5. Update `RESEND_FROM_EMAIL` to use your domain

**Development:** Use `onboarding@resend.dev` (no verification needed)

### 4. Test Configuration

```bash
npx tsx scripts/test-email.ts
```

This will:

- Test email configuration
- Send test welcome email
- Send test unsubscribe confirmation
- Send test newsletter

## 📚 Usage

### Import Email Service

```typescript
import { emailService } from "@/lib/email";
```

### Send Welcome Email

```typescript
const result = await emailService.sendWelcomeEmail(
  "user@example.com",
  "subscriber-token-123",
  "DAILY",
);

if (result.success) {
  console.log("Welcome email sent!", result.id);
} else {
  console.error("Failed:", result.error);
}
```

### Send Newsletter

```typescript
const subscribers = [
  { email: "user1@example.com", token: "token-1" },
  { email: "user2@example.com", token: "token-2" },
];

const result = await emailService.sendNewsletter(subscribers, {
  subject: "Bu Haftanın AI Haberleri",
  content: "<h2>Merhaba!</h2><p>Bu hafta...</p>",
  preheader: "Bu haftanın en önemli gelişmeleri",
});

console.log(`Sent: ${result.sent}, Failed: ${result.failed}`);
```

### Send Unsubscribe Confirmation

```typescript
const result =
  await emailService.sendUnsubscribeConfirmation("user@example.com");
```

### Send Custom Email

```typescript
const result = await emailService.send({
  to: "user@example.com",
  subject: "Custom Email",
  html: "<h1>Hello!</h1>",
  tags: [{ name: "type", value: "custom" }],
});
```

## 🎨 Email Templates

### Available Templates

1. **Newsletter Template** - For regular newsletters
2. **Welcome Template** - For new subscribers
3. **Unsubscribe Confirmation** - For unsubscribe confirmations
4. **Base Template** - Wrapper for all emails

### Customize Templates

Edit templates in `src/lib/email.ts`:

```typescript
export const emailTemplates = {
  newsletter: (data, unsubscribeUrl) => {
    // Your custom template
  },
  // ...
};
```

### Template Features

- Responsive design (mobile-friendly)
- Dark mode support
- Gradient header
- Automatic unsubscribe link
- Footer with links
- Preheader text support

## 🔌 API Endpoints

### POST /api/newsletter/send

Send newsletter to all active subscribers.

**Request:**

```json
{
  "subject": "Bu Haftanın AI Haberleri",
  "content": "<h2>Merhaba!</h2><p>Bu hafta...</p>",
  "preheader": "Bu haftanın en önemli gelişmeleri",
  "testMode": false,
  "testEmail": "test@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "150 aboneye e-posta gönderildi",
  "sent": 150,
  "failed": 0
}
```

### POST /api/newsletter/subscribe

Subscribe to newsletter (automatically sends welcome email).

**Request:**

```json
{
  "email": "user@example.com",
  "frequency": "DAILY",
  "categories": ["AI", "Technology"]
}
```

### GET /api/newsletter/unsubscribe?token=xxx

Unsubscribe from newsletter (automatically sends confirmation email).

## ⚙️ Configuration

### Environment Variables

| Variable                | Required | Default                 | Description        |
| ----------------------- | -------- | ----------------------- | ------------------ |
| `RESEND_API_KEY`        | ✅ Yes   | -                       | Resend API key     |
| `RESEND_FROM_EMAIL`     | ❌ No    | `onboarding@resend.dev` | From email address |
| `NEXT_PUBLIC_SITE_URL`  | ✅ Yes   | -                       | Site URL for links |
| `NEXT_PUBLIC_SITE_NAME` | ✅ Yes   | -                       | Site name          |

### Email Configuration

Edit `EMAIL_CONFIG` in `src/lib/email.ts`:

```typescript
const EMAIL_CONFIG = {
  from: "AI Haberleri <noreply@aihaberleri.org>",
  replyTo: "info@aihaberleri.org",
  apiUrl: "https://api.resend.com/emails",
  batchSize: 100, // Resend batch limit
  rateLimitDelay: 1000, // 1 second between batches
};
```

## 🧪 Testing

### Test Script

```bash
npx tsx scripts/test-email.ts
```

### Test Mode (API)

Send test email to specific address:

```bash
curl -X POST http://localhost:3000/api/newsletter/send \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test Newsletter",
    "content": "<h2>Test</h2>",
    "testMode": true,
    "testEmail": "your-email@example.com"
  }'
```

### Manual Testing

1. Subscribe to newsletter on website
2. Check email for welcome message
3. Click unsubscribe link
4. Check email for confirmation

## 📊 Monitoring

### Email Tracking

All emails are tagged for tracking:

- `type: newsletter` - Newsletter emails
- `type: welcome` - Welcome emails
- `type: unsubscribe` - Unsubscribe confirmations
- `type: test` - Test emails
- `campaign: YYYY-MM-DD` - Campaign date

### View Analytics

1. Go to [Resend Dashboard](https://resend.com/emails)
2. View email delivery status
3. Check open rates, click rates
4. Monitor bounces and complaints

### Database Logging

Newsletter campaigns are logged in `newsletterCampaign` table:

```sql
SELECT * FROM "NewsletterCampaign"
ORDER BY "sentAt" DESC
LIMIT 10;
```

## 🚨 Error Handling

### Common Errors

| Error                        | Cause               | Solution                |
| ---------------------------- | ------------------- | ----------------------- |
| `RESEND_API_KEY is required` | Missing API key     | Add to `.env`           |
| `Invalid API key`            | Wrong API key       | Check Resend dashboard  |
| `Domain not verified`        | Domain not verified | Verify domain in Resend |
| `Rate limit exceeded`        | Too many emails     | Wait or upgrade plan    |
| `Invalid email address`      | Malformed email     | Validate email format   |

### Error Logs

Check logs for email errors:

```bash
# Development
npm run dev

# Production
pm2 logs
```

### Retry Logic

Email service automatically retries failed emails:

- Batch processing with delays
- Individual error tracking
- Failed emails logged separately

## 🔒 Security

### Best Practices

1. **Never expose API key** - Keep in `.env`, never commit
2. **Validate email addresses** - Use Zod schema validation
3. **Rate limiting** - Prevent spam (1 second between batches)
4. **Unsubscribe link** - Required by law (CAN-SPAM, GDPR)
5. **Double opt-in** - Consider adding email verification
6. **SPF/DKIM/DMARC** - Configure for production domain

### GDPR Compliance

- ✅ Unsubscribe link in every email
- ✅ Confirmation emails
- ✅ User consent tracking
- ✅ Data deletion on unsubscribe
- ✅ Privacy policy link

## 📈 Performance

### Batch Processing

- **Batch size:** 100 emails per batch
- **Rate limit:** 1 second between batches
- **Parallel sending:** Within each batch
- **Total time:** ~1 second per 100 emails

### Example Performance

| Subscribers | Batches | Time  |
| ----------- | ------- | ----- |
| 100         | 1       | ~1s   |
| 500         | 5       | ~5s   |
| 1,000       | 10      | ~10s  |
| 10,000      | 100     | ~100s |

### Optimization Tips

1. **Schedule during off-peak hours** - Better deliverability
2. **Segment subscribers** - Send targeted content
3. **Clean email list** - Remove bounces regularly
4. **Monitor metrics** - Track open/click rates
5. **A/B testing** - Test subject lines

## 🎯 Best Practices

### Email Content

- ✅ Clear, concise subject lines (< 50 characters)
- ✅ Preheader text (< 100 characters)
- ✅ Mobile-responsive design
- ✅ Clear call-to-action (CTA)
- ✅ Unsubscribe link (required)
- ✅ Plain text alternative
- ✅ Avoid spam trigger words

### Sending Frequency

- **Real-time:** Immediate (breaking news)
- **Daily:** Once per day (morning)
- **Weekly:** Once per week (Monday)
- **Monthly:** Once per month (1st of month)

### Subject Line Tips

- ✅ Keep under 50 characters
- ✅ Use emojis sparingly (1-2 max)
- ✅ Create urgency (limited time)
- ✅ Personalize when possible
- ✅ A/B test different versions
- ❌ Avoid ALL CAPS
- ❌ Avoid excessive punctuation!!!

## 🔄 Migration from Other Services

### From Nodemailer

Replace Nodemailer with Resend:

```typescript
// Before (Nodemailer)
const transporter = nodemailer.createTransport({...});
await transporter.sendMail({...});

// After (Resend)
import { emailService } from "@/lib/email";
await emailService.send({...});
```

### From SendGrid

Replace SendGrid with Resend:

```typescript
// Before (SendGrid)
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
await sgMail.send({...});

// After (Resend)
import { emailService } from "@/lib/email";
await emailService.send({...});
```

## 📞 Support

### Resend Support

- Documentation: [resend.com/docs](https://resend.com/docs)
- Status: [status.resend.com](https://status.resend.com)
- Support: support@resend.com

### Project Support

- Issues: GitHub Issues
- Email: info@aihaberleri.org

## 📝 Changelog

### v1.0.0 (2024-01-XX)

- ✅ Initial email service implementation
- ✅ Resend API integration
- ✅ Newsletter, welcome, unsubscribe templates
- ✅ Batch processing with rate limiting
- ✅ Error handling and logging
- ✅ Test script
- ✅ API endpoints
- ✅ Documentation

## 🎉 Ready to Use!

Your email service is now ready for production. Start sending newsletters to your subscribers!

```bash
# Test the service
npx tsx scripts/test-email.ts

# Start development server
npm run dev

# Send newsletter from admin panel
# http://localhost:3000/admin/newsletter/send
```

---

**Built with ❤️ for AI Haberleri**
