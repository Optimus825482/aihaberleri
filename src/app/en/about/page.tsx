import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us - AI News",
  description:
    "Learn more about AI News, your trusted source for the latest artificial intelligence developments.",
};

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">About Us</h1>

      <div className="prose prose-lg dark:prose-invert">
        <p className="lead text-xl mb-6">
          Welcome to AI News, your premier destination for the latest updates,
          analysis, and insights in the world of Artificial Intelligence.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">Our Mission</h2>
        <p>
          Our mission is to democratize access to artificial intelligence
          knowledge. We believe that understanding AI is crucial for the future,
          and we strive to make complex technological developments accessible to
          everyone, from industry experts to curious enthusiasts.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">What We Cover</h2>
        <ul className="list-disc pl-6 space-y-2 mb-6">
          <li>
            <strong>Machine Learning:</strong> Deep dives into algorithms and
            models.
          </li>
          <li>
            <strong>Generative AI:</strong> The latest in LLMs, image
            generation, and creative AI.
          </li>
          <li>
            <strong>Robotics:</strong> Advances in autonomous systems and
            physical AI.
          </li>
          <li>
            <strong>Ethics & Policy:</strong> Critical discussions about the
            impact of AI on society.
          </li>
          <li>
            <strong>Industry News:</strong> Mergers, acquisitions, and startup
            highlights.
          </li>
        </ul>

        <h2 className="text-2xl font-bold mt-8 mb-4">Our Approach</h2>
        <p>
          We leverage cutting-edge technology to curate and summarize the most
          important news from around the globe. Our dedicated system monitors
          thousands of sources to bring you real-time updates without the noise.
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4">Contact Us</h2>
        <p>
          Have a tip or want to get in touch? Email us at{" "}
          <a
            href="mailto:contact@ainews.com"
            className="text-blue-600 hover:underline"
          >
            contact@ainews.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}
