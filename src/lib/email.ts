import { Resend } from "resend";

export interface PengingatEmailPayload {
  to: string;
  namaUploader: string;
  judulDokumen: string;
  berlakuSampai: number;
  sisaHari: number;
  dokumenId: string;
}

/**
 * Mengirim email pengingat dokumen segera berakhir (F7).
 * Menggunakan Resend bila RESEND_API_KEY tersedia; simulasi log pada lingkungan dev.
 */
export async function kirimEmailPengingat(
  payload: PengingatEmailPayload
): Promise<{ sent: boolean; simulated?: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.EMAIL_FROM || "Pusat Dokumen ITBMP <noreply@itbmp.ac.id>";

  const subject = `[Pusat Dokumen] Dokumen segera berakhir (${payload.sisaHari} hari): ${payload.judulDokumen}`;
  const text = [
    `Halo ${payload.namaUploader},`,
    "",
    `Dokumen berikut akan segera berakhir masa berlakunya:`,
    `- Judul: ${payload.judulDokumen}`,
    `- Berlaku sampai: 31 Desember ${payload.berlakuSampai}`,
    `- Sisa waktu: ${payload.sisaHari} hari`,
    "",
    `Untuk memperbarui dokumen yang sudah terbit, hubungi verifikator agar ACC dibatalkan sementara sehingga Anda dapat mengedit dan mengirim ulang.`,
    "",
    `— Pusat Dokumen Kampus ITBMP`,
  ].join("\n");

  if (!apiKey) {
    console.info("[EMAIL SIMULASI]", { to: payload.to, subject });
    return { sent: true, simulated: true };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: payload.to,
      subject,
      text,
    });
    if (error) {
      return { sent: false, error: error.message };
    }
    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : "Gagal mengirim email",
    };
  }
}

/**
 * Menentukan apakah pengingat 60 atau 14 hari perlu dikirim (pure helper untuk F7 & Uji #18).
 */
export function tentukanPengingat(params: {
  sisaHari: number;
  pengingat60: boolean;
  pengingat14: boolean;
}): { kirim60: boolean; kirim14: boolean } {
  if (params.sisaHari < 0) {
    return { kirim60: false, kirim14: false };
  }
  const kirim14 = params.sisaHari <= 14 && !params.pengingat14;
  const kirim60 = !kirim14 && params.sisaHari <= 60 && !params.pengingat60;
  return { kirim60, kirim14 };
}
