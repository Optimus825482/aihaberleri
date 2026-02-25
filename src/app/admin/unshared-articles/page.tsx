import { redirect } from "next/navigation";

export default function UnsharedArticlesRedirectPage() {
  redirect("/admin/social-shares");
}
