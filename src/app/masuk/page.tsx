import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { LoginForm } from "@/components/LoginForm";
import { getCurrentUser } from "@/lib/auth";

export default async function MasukPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  const params = await searchParams;
  const callbackUrl =
    params.callbackUrl && params.callbackUrl.startsWith("/")
      ? params.callbackUrl
      : "/";

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F3" }}>
      <AppHeader activePath="/masuk" />
      <main style={{ maxWidth: 460, margin: "0 auto", padding: "48px 24px" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 700 }}>
          Masuk ke Pusat Dokumen
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: 15, color: "#55645B" }}>
          Masuk untuk mengakses dokumen internal kampus sesuai hak akses akun Anda.
        </p>
        <LoginForm callbackUrl={callbackUrl} />
      </main>
    </div>
  );
}
