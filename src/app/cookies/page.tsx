import { redirect } from "next/navigation";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Çerez Politikası | AI Haberleri",
  description:
    "AI Haberleri çerez politikası. Çerezlerin nasıl kullanıldığını öğrenin.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function CookiesPage() {
  // Redirect to privacy page - cookie section
  redirect("/privacy#cerez");
}
