import { redirect } from "next/navigation";

export default function RetrySharesRedirectPage() {
  redirect("/admin/social-shares");
}
