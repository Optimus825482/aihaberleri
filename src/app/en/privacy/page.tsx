import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - AI News",
  description: "Privacy Policy for AI News platform.",
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

      <div className="prose prose-lg dark:prose-invert">
        <p className="text-sm text-gray-500 mb-8">
          Last Updated: January 28, 2026
        </p>

        <p>
          At AI News, we take your privacy seriously. This Privacy Policy
          explains how we collect, use, and protect your personal information.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">
          1. Information We Collect
        </h2>
        <p>We may collect the following types of information:</p>
        <ul className="list-disc pl-6 space-y-2 mb-6">
          <li>
            <strong>Personal Information:</strong> such as your email address
            when you subscribe to our newsletter.
          </li>
          <li>
            <strong>Usage Data:</strong> information about how you interact with
            our website, including pages visited and time spent.
          </li>
          <li>
            <strong>Device Information:</strong> browser type, operating system,
            and IP address.
          </li>
        </ul>

        <h2 className="text-2xl font-bold mt-8 mb-4">
          2. How We Use Your Information
        </h2>
        <p>We use the collected information to:</p>
        <ul className="list-disc pl-6 space-y-2 mb-6">
          <li>Provide and maintain our service.</li>
          <li>Send you newsletters and updates (if subscribed).</li>
          <li>Analyze usage patterns to improve user experience.</li>
          <li>Detect and prevent technical issues.</li>
        </ul>

        <h2 className="text-2xl font-bold mt-8 mb-4">3. Cookies</h2>
        <p>
          We use cookies to enhance your browsing experience. You can instruct
          your browser to refuse all cookies or to indicate when a cookie is
          being sent.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">4. Data Security</h2>
        <p>
          The security of your data is important to us, but remember that no
          method of transmission over the Internet is 100% secure. We strive to
          use commercially acceptable means to protect your Personal Data.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">5. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact
          us.
        </p>
      </div>
    </div>
  );
}
