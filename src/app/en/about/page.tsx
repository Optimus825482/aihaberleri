import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About Us | AI News - Artificial Intelligence News Platform",
  description:
    "aihaberleri.org is an independent AI news platform delivering timely developments, in-depth analysis, and technical insights from across the global AI ecosystem.",
  keywords: ["artificial intelligence", "AI news", "about us", "Erkan ERDEM", "tech news"],
  alternates: {
    canonical: "https://aihaberleri.org/en/about",
    languages: {
      "tr-TR": "https://aihaberleri.org/about",
      "en-US": "https://aihaberleri.org/en/about",
    },
  },
  openGraph: {
    title: "About Us | AI News",
    description: "Timely AI developments, in-depth analysis, and technical insights from a global perspective.",
    url: "https://aihaberleri.org/en/about",
    siteName: "AI News",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://aihaberleri.org/logos/brand/ai-logo-dark.png",
        width: 1200,
        height: 630,
        alt: "AI News Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Us | AI News",
    description: "Timely AI developments, in-depth analysis, and technical insights from a global perspective.",
    site: "@AiHaberleri",
    images: ["https://aihaberleri.org/logos/brand/ai-logo-dark.png"],
  },
};

// Organization Schema JSON-LD
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "AI News",
  alternateName: "AI Haberleri",
  url: "https://aihaberleri.org",
  logo: "https://aihaberleri.org/logos/brand/ai-logo-dark.png",
  description: "Independent AI news platform delivering timely developments, in-depth analysis, and technical insights.",
  sameAs: [
    "https://twitter.com/AiHaberleri",
    "https://facebook.com/aihaberleri",
    "https://linkedin.com/company/aihaberleri",
  ],
  founder: {
    "@type": "Person",
    name: "Erkan ERDEM",
    url: "https://erkanerdem.net",
  },
  foundingDate: "2024",
  contactPoint: {
    "@type": "ContactPoint",
    email: "info@aihaberleri.org",
    contactType: "customer service",
    availableLanguage: ["Turkish", "English"],
  },
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <div className="min-h-screen bg-ai-background-dark">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <h1 className="text-4xl font-bold mb-8 text-white">About Us</h1>

          <div className="space-y-8">
            <p className="text-xl text-ai-text-secondary">
              aihaberleri.org is an independent news platform built to help readers
              follow and understand the fast-moving AI ecosystem in 2026 and beyond.
            </p>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">Our Mission</h2>
              <p className="text-ai-text-secondary">
                We do more than summarize headlines. From large language models and
                robotics to policy, ethics, and developer tooling, our mission is to
                make complex AI developments accessible without sacrificing technical
                depth.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">A Global Perspective</h2>
              <p className="text-ai-text-secondary">
                While we are based in Türkiye, our audience spans the United States,
                India, the United Kingdom, Australia, and beyond. This global reach
                reinforces our commitment to editorial neutrality and universal quality
                standards.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">Why Us</h2>
              <ul className="list-disc pl-6 space-y-2 text-ai-text-secondary">
                <li>
                  <strong className="text-white">Technical Depth:</strong> We cover high-signal topics
                  ranging from frontier model releases to practical engineering
                  implications.
                </li>
                <li>
                  <strong className="text-white">Timeliness:</strong> In AI, timing matters. We publish
                  critical updates quickly, with context.
                </li>
                <li>
                  <strong className="text-white">Independence:</strong> We are not tied to any single tech
                  giant, and we evaluate tools and models transparently.
                </li>
                <li>
                  <strong className="text-white">Clarity:</strong> We translate complexity into clear,
                  useful insight for both practitioners and curious readers.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">How We Work</h2>
              <p className="text-ai-text-secondary mb-4">
                Our editorial process is built on speed, context, and technical
                accuracy. We monitor major global sources, then evaluate each update
                for real-world impact instead of repeating headlines.
              </p>
              <p className="text-ai-text-secondary">
                Every article is crafted to be readable for non-specialists while
                remaining useful for developers, researchers, and decision-makers.
                The goal is not just news delivery, but meaningful understanding.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">Who We Serve</h2>
              <ul className="list-disc pl-6 space-y-2 text-ai-text-secondary">
                <li>Technology enthusiasts tracking AI in real time.</li>
                <li>Professionals integrating AI into products and workflows.</li>
                <li>Developers and researchers following model and tooling shifts.</li>
                <li>Decision-makers seeking clear AI context without hype.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">Building the Future Together</h2>
              <p className="text-ai-text-secondary">
                Artificial intelligence is not just another technology cycle; it is a
                foundational shift. At AI News, we are excited to guide this journey
                with trustworthy reporting, deep analysis, and an open community
                mindset.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">Contact Us</h2>
              <p className="text-ai-text-secondary">
                For feedback, partnerships, or community inquiries, contact us at{" "}
                <a
                  href="mailto:info@aihaberleri.org"
                  className="text-ai-primary hover:underline"
                >
                  info@aihaberleri.org
                </a>
                , or join us through our social media channels.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
