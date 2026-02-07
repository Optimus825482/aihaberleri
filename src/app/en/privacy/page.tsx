import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | AI News - Data Protection",
  description:
    "AI News privacy policy. Learn how we collect, use, and protect your personal data in compliance with privacy regulations.",
  keywords: ["privacy policy", "data protection", "cookies", "personal data", "AI News"],
  alternates: {
    canonical: "https://aihaberleri.org/en/privacy",
    languages: {
      "tr-TR": "https://aihaberleri.org/privacy",
      "en-US": "https://aihaberleri.org/en/privacy",
    },
  },
  openGraph: {
    title: "Privacy Policy | AI News",
    description: "AI News privacy policy and data protection practices.",
    url: "https://aihaberleri.org/en/privacy",
    siteName: "AI News",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy | AI News",
    description: "AI News privacy policy and data protection practices.",
    site: "@AiHaberleri",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-ai-background-dark">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-white">Privacy Policy</h1>

        <div className="space-y-8">
          <p className="text-sm text-ai-text-muted">
            Last Updated: January 28, 2026
          </p>

          <p className="text-ai-text-secondary">
            At AI News, we take your privacy seriously. This Privacy Policy
            explains how we collect, use, and protect your personal information.
          </p>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">
              1. Information We Collect
            </h2>
            <p className="text-ai-text-secondary mb-4">We may collect the following types of information:</p>
            <ul className="list-disc pl-6 space-y-2 text-ai-text-secondary">
              <li>
                <strong className="text-white">Personal Information:</strong> such as your email address
                when you subscribe to our newsletter.
              </li>
              <li>
                <strong className="text-white">Usage Data:</strong> information about how you interact with
                our website, including pages visited and time spent.
              </li>
              <li>
                <strong className="text-white">Device Information:</strong> browser type, operating system,
                and IP address.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">
              2. How We Use Your Information
            </h2>
            <p className="text-ai-text-secondary mb-4">We use the collected information to:</p>
            <ul className="list-disc pl-6 space-y-2 text-ai-text-secondary">
              <li>Provide and maintain our service.</li>
              <li>Send you newsletters and updates (if subscribed).</li>
              <li>Analyze usage patterns to improve user experience.</li>
              <li>Detect and prevent technical issues.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">3. Cookies</h2>
            <p className="text-ai-text-secondary">
              We use cookies to enhance your browsing experience. You can instruct
              your browser to refuse all cookies or to indicate when a cookie is
              being sent.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">4. Data Security</h2>
            <p className="text-ai-text-secondary">
              The security of your data is important to us, but remember that no
              method of transmission over the Internet is 100% secure. We strive to
              use commercially acceptable means to protect your Personal Data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">5. Contact Us</h2>
            <p className="text-ai-text-secondary">
              If you have any questions about this Privacy Policy, please contact
              us.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
