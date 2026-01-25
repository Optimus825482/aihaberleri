/**
 * Email Service Test Script
 *
 * Tests the email service configuration and functionality
 *
 * Usage:
 *   npx tsx scripts/test-email.ts
 */

import "dotenv/config";
import { emailService } from "../src/lib/email";

// Helper function to wait
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function testEmailService() {
  console.log("🧪 Testing Email Service...\n");
  console.log("⏱️  Rate limit: 2 emails/second (adding delays)\n");

  // Test 1: Connection Test
  console.log("1️⃣ Testing email configuration...");
  const connectionTest = await emailService.testConnection();

  if (connectionTest.success) {
    console.log("✅ Email configuration is working!\n");
  } else {
    console.error("❌ Email configuration failed!");
    console.error(`   Error: ${connectionTest.error}\n`);
    process.exit(1);
  }

  // Wait to respect rate limit
  await wait(600);

  // Test 2: Welcome Email
  console.log("2️⃣ Testing welcome email...");
  const welcomeTest = await emailService.sendWelcomeEmail(
    "test@example.com",
    "test-token-123",
    "DAILY",
  );

  if (welcomeTest.success) {
    console.log("✅ Welcome email sent successfully!\n");
  } else {
    console.error("❌ Welcome email failed!");
    console.error(`   Error: ${welcomeTest.error}\n`);
  }

  // Wait to respect rate limit
  await wait(600);

  // Test 3: Unsubscribe Confirmation
  console.log("3️⃣ Testing unsubscribe confirmation...");
  const unsubscribeTest =
    await emailService.sendUnsubscribeConfirmation("test@example.com");

  if (unsubscribeTest.success) {
    console.log("✅ Unsubscribe confirmation sent successfully!\n");
  } else {
    console.error("❌ Unsubscribe confirmation failed!");
    console.error(`   Error: ${unsubscribeTest.error}\n`);
  }

  // Wait to respect rate limit
  await wait(600);

  // Test 4: Newsletter Email
  console.log("4️⃣ Testing newsletter email...");
  const newsletterTest = await emailService.sendNewsletter(
    [
      { email: "test1@example.com", token: "token-1" },
      { email: "test2@example.com", token: "token-2" },
    ],
    {
      subject: "Test Newsletter - AI Haberleri",
      content: `
        <h2>Bu Haftanın En Önemli AI Haberleri</h2>
        <p>Merhaba,</p>
        <p>Bu hafta yapay zeka dünyasında önemli gelişmeler yaşandı:</p>
        <ul>
          <li><strong>OpenAI GPT-5 Duyuruldu:</strong> Yeni model daha güçlü ve hızlı</li>
          <li><strong>Google Gemini Güncellemesi:</strong> Multimodal yetenekler geliştirildi</li>
          <li><strong>AI Güvenliği:</strong> Yeni düzenlemeler yolda</li>
        </ul>
        <p>Detaylı haberleri okumak için <a href="https://aihaberleri.org">web sitemizi ziyaret edin</a>.</p>
        <p>İyi okumalar!</p>
      `,
      preheader: "Bu haftanın en önemli AI gelişmeleri",
    },
  );

  console.log(`✅ Newsletter sent to ${newsletterTest.sent} recipients`);
  if (newsletterTest.failed > 0) {
    console.log(`⚠️  ${newsletterTest.failed} emails failed`);
    console.log(`   Errors: ${newsletterTest.errors.join(", ")}`);
  }
  console.log();

  // Summary
  console.log("📊 Test Summary:");
  console.log("================");
  console.log(
    `✅ Connection Test: ${connectionTest.success ? "PASS" : "FAIL"}`,
  );
  console.log(`✅ Welcome Email: ${welcomeTest.success ? "PASS" : "FAIL"}`);
  console.log(
    `✅ Unsubscribe Email: ${unsubscribeTest.success ? "PASS" : "FAIL"}`,
  );
  console.log(
    `✅ Newsletter: ${newsletterTest.sent}/${newsletterTest.sent + newsletterTest.failed} sent`,
  );
  console.log();

  const allPassed =
    connectionTest.success &&
    welcomeTest.success &&
    unsubscribeTest.success &&
    newsletterTest.failed === 0;

  if (allPassed) {
    console.log("🎉 All tests passed! Email service is ready for production.");
  } else {
    console.log("⚠️  Some tests failed. Please check the configuration.");
  }
}

// Run tests
testEmailService().catch((error) => {
  console.error("❌ Test script failed:", error);
  process.exit(1);
});
