import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Terms of Use - AI News",
  description: "Terms and conditions for using AI News platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-ai-background-dark">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-white">Terms of Use</h1>

        <div className="space-y-8">
          <p className="text-sm text-ai-text-muted">
            Last Updated: January 28, 2026
          </p>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">1. Acceptance of Terms</h2>
            <p className="text-ai-text-secondary">
              By accessing and using AI News ("the Service"), you accept and agree
              to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">2. Use License</h2>
            <p className="text-ai-text-secondary mb-4">
              Permission is granted to temporarily download one copy of the
              materials (information or software) on AI News' website for personal,
              non-commercial transitory viewing only.
            </p>
            <p className="text-ai-text-secondary mb-4">
              This is the grant of a license, not a transfer of title, and under
              this license you may not:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-ai-text-secondary">
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
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">3. Disclaimer</h2>
            <p className="text-ai-text-secondary">
              The materials on AI News' website are provided on an 'as is' basis. AI
              News makes no warranties, expressed or implied, and hereby disclaims
              and negates all other warranties including, without limitation,
              implied warranties or conditions of merchantability, fitness for a
              particular purpose, or non-infringement of intellectual property or
              other violation of rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">4. Limitations</h2>
            <p className="text-ai-text-secondary">
              In no event shall AI News or its suppliers be liable for any damages
              (including, without limitation, damages for loss of data or profit, or
              due to business interruption) arising out of the use or inability to
              use the materials on AI News' website.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-white">5. Governing Law</h2>
            <p className="text-ai-text-secondary">
              These terms and conditions are governed by and construed in accordance
              with the laws of Turkey and you irrevocably submit to the exclusive
              jurisdiction of the courts in that State or location.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
