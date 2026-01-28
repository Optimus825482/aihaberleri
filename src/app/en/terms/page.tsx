import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use - AI News",
  description: "Terms and conditions for using AI News platform.",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Terms of Use</h1>

      <div className="prose prose-lg dark:prose-invert">
        <p className="text-sm text-gray-500 mb-8">
          Last Updated: January 28, 2026
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">1. Acceptance of Terms</h2>
        <p>
          By accessing and using AI News ("the Service"), you accept and agree
          to be bound by the terms and provision of this agreement.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">2. Use License</h2>
        <p>
          Permission is granted to temporarily download one copy of the
          materials (information or software) on AI News' website for personal,
          non-commercial transitory viewing only.
        </p>
        <p>
          This is the grant of a license, not a transfer of title, and under
          this license you may not:
        </p>
        <ul className="list-disc pl-6 space-y-2 mb-6">
          <li>modify or copy the materials;</li>
          <li>use the materials for any commercial purpose;</li>
          <li>
            attempt to decompile or reverse engineer any software contained on
            the website;
          </li>
          <li>
            remove any copyright or other proprietary notations from the
            materials.
          </li>
        </ul>

        <h2 className="text-2xl font-bold mt-8 mb-4">3. Disclaimer</h2>
        <p>
          The materials on AI News' website are provided on an 'as is' basis. AI
          News makes no warranties, expressed or implied, and hereby disclaims
          and negates all other warranties including, without limitation,
          implied warranties or conditions of merchantability, fitness for a
          particular purpose, or non-infringement of intellectual property or
          other violation of rights.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">4. Limitations</h2>
        <p>
          In no event shall AI News or its suppliers be liable for any damages
          (including, without limitation, damages for loss of data or profit, or
          due to business interruption) arising out of the use or inability to
          use the materials on AI News' website.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">5. Governing Law</h2>
        <p>
          These terms and conditions are governed by and construed in accordance
          with the laws of Turkey and you irrevocably submit to the exclusive
          jurisdiction of the courts in that State or location.
        </p>
      </div>
    </div>
  );
}
