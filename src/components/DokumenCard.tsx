import Link from "next/link";
import type { ResponsDokumen } from "@/lib/akses";
import { StatusBerlakuBadge, TipeAksesBadge } from "@/components/Badges";

export function DokumenCard({ doc }: { doc: ResponsDokumen }) {
  if (doc.tampilan === "TERBATAS") {
    return (
      <article
        style={{
          background: "#FBFCFB",
          border: "1px dashed #B9C5BD",
          borderRadius: 14,
          padding: "20px 22px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 13, color: "#55645B" }}>
            {doc.kategoriJalur}
          </span>
          <TipeAksesBadge tipe={doc.tipeAkses} />
        </div>
        <h3 style={{ margin: "8px 0 6px", fontSize: 18, fontWeight: 600 }}>
          {doc.judul}
        </h3>
        <p style={{ margin: 0, fontSize: 14, color: "#55645B" }}>
          Hanya judul yang ditampilkan. Deskripsi dan link disembunyikan.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              minHeight: 44,
              padding: "0 16px",
              fontSize: 14,
              fontWeight: 600,
              color: "#7A1A10",
              background: "#FCE9E6",
              borderRadius: 10,
            }}
          >
            {doc.pesan}
          </span>
        </div>
      </article>
    );
  }

  return (
    <article
      style={{
        background: "#FFFFFF",
        border: "1px solid #DDE3DE",
        borderRadius: 14,
        padding: "20px 22px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 13, color: "#55645B" }}>
          {doc.kategoriJalur}
        </span>
        <TipeAksesBadge tipe={doc.tipeAkses} />
      </div>

      <h3 style={{ margin: "8px 0 6px", fontSize: 18, fontWeight: 600 }}>
        {doc.judul}
      </h3>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "#34433A" }}>
        {doc.deskripsi}
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "8px 16px",
          marginTop: 14,
          fontSize: 13,
          color: "#55645B",
        }}
      >
        <span>
          Tahun dokumen{" "}
          <strong style={{ color: "#14221B", fontWeight: 600 }}>
            {doc.tahun}
          </strong>
        </span>
        <span>
          Berlaku s/d{" "}
          <strong style={{ color: "#14221B", fontWeight: 600 }}>
            {doc.berlakuSampai ?? "Tidak kedaluwarsa"}
          </strong>
        </span>
        <StatusBerlakuBadge status={doc.statusBerlaku} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
        <a
          href={doc.linkDrive}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            minHeight: 44,
            padding: "0 18px",
            background: "#0E6B4D",
            color: "#FFFFFF",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Buka di Google Drive ↗
        </a>
        <Link
          href={`/dokumen/${doc.id}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            minHeight: 44,
            padding: "0 18px",
            border: "1.5px solid #9FB0A5",
            color: "#14221B",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Lihat detail
        </Link>
      </div>
    </article>
  );
}
