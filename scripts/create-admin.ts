import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

async function main() {
  const prisma = new PrismaClient();

  const email = "admin@aihaberleri.org";
  const password = "518518";
  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hashedPassword, role: "SUPER_ADMIN", isActive: true },
    create: {
      email,
      password: hashedPassword,
      name: "Admin",
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  console.log(`✅ Admin oluşturuldu: ${user.email} (${user.id})`);
  await prisma.$disconnect();
}

main().catch(console.error);
