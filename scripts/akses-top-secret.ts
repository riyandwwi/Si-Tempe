/**
 * Skrip server khusus untuk mengelola AksesTopSecret (Bagian 6.3 & 17 SPEC).
 * Penggunaan:
 *   npx tsx scripts/akses-top-secret.ts grant <dokumenId> <emailPengguna>
 *   npx tsx scripts/akses-top-secret.ts revoke <dokumenId> <emailPengguna>
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [action, dokumenId, email] = process.argv.slice(2);
  if (!action || !dokumenId || !email || !["grant", "revoke"].includes(action)) {
    console.error("Pemakaian: npx tsx scripts/akses-top-secret.ts <grant|revoke> <dokumenId> <email>");
    process.exit(1);
  }

  const user = await prisma.pengguna.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user) {
    console.error(`Pengguna tidak ditemukan: ${email}`);
    process.exit(1);
  }

  const doc = await prisma.dokumen.findUnique({ where: { id: dokumenId } });
  if (!doc) {
    console.error(`Dokumen tidak ditemukan: ${dokumenId}`);
    process.exit(1);
  }

  if (action === "grant") {
    await prisma.aksesTopSecret.upsert({
      where: {
        dokumenId_penggunaId: { dokumenId: doc.id, penggunaId: user.id },
      },
      update: {},
      create: { dokumenId: doc.id, penggunaId: user.id },
    });
    console.log(`Akses Top Secret DIBERIKAN: ${user.email} -> ${doc.id}`);
  } else {
    await prisma.aksesTopSecret.deleteMany({
      where: { dokumenId: doc.id, penggunaId: user.id },
    });
    console.log(`Akses Top Secret DICABUT: ${user.email} -> ${doc.id}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
