export interface HasilCekLink {
  ok: boolean;
  statusCode: number | null;
  pesan: string;
}

const NOT_FOUND_PATTERNS = [
  "tidak ditemukan",
  "page not found",
  "file you have requested does not exist",
  "sorry, the file you have requested does not exist",
  "error 404",
];

/**
 * Cek ketersediaan link Google Drive untuk prototipe (F6 langkah 4).
 * Mengirim HEAD/GET dan menganggap mati jika status 404/410 atau halaman "tidak ditemukan".
 */
export async function cekLinkDrive(url: string): Promise<HasilCekLink> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    let res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });

    if (res.status === 405 || res.status === 403 || res.status === 400) {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
      });
    }

    if (res.status === 404 || res.status === 410) {
      return {
        ok: false,
        statusCode: res.status,
        pesan: `Link tidak ditemukan (HTTP ${res.status}).`,
      };
    }

    if (res.headers.get("content-type")?.includes("text/html")) {
      const text = (await res.text()).slice(0, 8000).toLowerCase();
      if (NOT_FOUND_PATTERNS.some((p) => text.includes(p))) {
        return {
          ok: false,
          statusCode: res.status,
          pesan: "Halaman mengindikasikan file tidak ditemukan di Google Drive.",
        };
      }
    }

    return {
      ok: true,
      statusCode: res.status,
      pesan: `Link merespons normal (HTTP ${res.status}).`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal menghubungi URL";
    return {
      ok: false,
      statusCode: null,
      pesan: `Link gagal diakses: ${msg}`,
    };
  } finally {
    clearTimeout(timer);
  }
}
