import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni | AI Haberleri",
  description:
    "6698 Sayılı Kişisel Verilerin Korunması Kanunu kapsamında aydınlatma metni.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function KVKKPage() {
  // Redirect to privacy page - KVKK info is in the introduction and user rights sections
  redirect("/privacy#haklar");
}
