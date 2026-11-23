import { AppHeader } from "@/components/AppHeader";
import { CariClient } from "@/components/CariClient";
import { getCurrentUser } from "@/lib/auth";
import { cariDokumenServer, parseCariSearchParams } from "@/lib/pencarian";

export default async function CariPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, rawParams] = await Promise.all([
    getCurrentUser(),
    searchParams,
  ]);

  const params = parseCariSearchParams(rawParams);
  const hasil = await cariDokumenServer(user, params);

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F3" }}>
      <AppHeader activePath="/cari" />
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 48px" }}>
        <h1
          style={{
            margin: "0 0 16px",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.01em",
          }}
        >
          Cari dokumen kampus
        </h1>
        <CariClient initialParams={params} hasil={hasil} />
      </main>
    </div>
  );
}
