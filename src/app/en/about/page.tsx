import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | AI News - Artificial Intelligence News Platform",
  description:
    "AI News is an AI news platform founded by Erkan ERDEM, providing the latest artificial intelligence developments and insights from global sources.",
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
    description: "Your trusted source for the latest artificial intelligence developments and insights.",
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
    description: "Your trusted source for the latest artificial intelligence developments and insights.",
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
  description: "Your trusted source for the latest artificial intelligence developments and insights.",
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
    email: "contact@aihaberleri.org",
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
              Welcome to AI News, your premier destination for the latest updates,
              analysis, and insights in the world of Artificial Intelligence.
            </p>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">Our Mission</h2>
              <p className="text-ai-text-secondary">
                Our mission is to democratize access to artificial intelligence
                knowledge. We believe that understanding AI is crucial for the future,
                and we strive to make complex technological developments accessible to
                everyone, from industry experts to curious enthusiasts.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">What We Cover</h2>
              <ul className="list-disc pl-6 space-y-2 text-ai-text-secondary">
                <li>
                  <strong className="text-white">Machine Learning:</strong> Deep dives into algorithms and
                  models.
                </li>
                <li>
                  <strong className="text-white">Generative AI:</strong> The latest in LLMs, image
                  generation, and creative AI.
                </li>
                <li>
                  <strong className="text-white">Robotics:</strong> Advances in autonomous systems and
                  physical AI.
                </li>
                <li>
                  <strong className="text-white">Ethics & Policy:</strong> Critical discussions about the
                  impact of AI on society.
                </li>
                <li>
                  <strong className="text-white">Industry News:</strong> Mergers, acquisitions, and startup
                  highlights.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">Our Approach</h2>
              <p className="text-ai-text-secondary">
                We leverage cutting-edge technology to curate and summarize the most
                important news from around the globe. Our dedicated system monitors
                thousands of sources to bring you real-time updates without the noise.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">Contact Us</h2>
              <p className="text-ai-text-secondary">
                Have a tip or want to get in touch? Email us at{" "}
                <a
                  href="mailto:contact@ainews.com"
                  className="text-ai-primary hover:underline"
                >
                  contact@ainews.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
