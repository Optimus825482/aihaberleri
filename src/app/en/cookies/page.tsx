import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Cookie Policy | AI News",
    description:
        "Learn how AI News uses cookies for essential functionality, analytics, and advertising preferences including Google AdSense.",
    robots: {
        index: true,
        follow: true,
    },
};

export default function CookiesPageEN() {
    return (
        <div className="min-h-screen bg-ai-background-dark">
            <main className="container mx-auto px-4 py-12 max-w-4xl">
                <h1 className="text-4xl font-bold text-white mb-6">Cookie Policy</h1>
                <p className="text-ai-text-secondary mb-8">
                    Last updated: February 22, 2026
                </p>

                <div className="space-y-8 text-ai-text-secondary leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-3">1. What we use cookies for</h2>
                        <p>
                            We use cookies to keep core site functions working, measure usage, and manage advertising
                            preferences.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-3">2. Cookie categories</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>
                                <strong className="text-white">Essential:</strong> Required for core functionality and security.
                            </li>
                            <li>
                                <strong className="text-white">Analytics:</strong> Helps us understand traffic and improve content quality.
                            </li>
                            <li>
                                <strong className="text-white">Advertising:</strong> Used for ad delivery and personalization, including Google AdSense when enabled.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-3">3. Managing your choices</h2>
                        <p>
                            You can update cookie preferences from our consent banner at any time. Rejecting advertising cookies
                            may reduce ad personalization.
                        </p>
                    </section>
                </div>
            </main>
        </div>
    );
}
