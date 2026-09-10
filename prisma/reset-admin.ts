import { prisma } from "../src/infrastructure/db/prisma";
import { createHash } from "crypto";

async function resetAdmin() {
  const args = process.argv.slice(2);
  const newEmail = args[0] || "admin@youthempowerment.in";
  const newPassword = args[1] || "YEH@Admin2026";

  console.log(`🔑 Resetting Super Admin credentials...`);
  console.log(`   Target Email: ${newEmail}`);

  // Find or create admin user
  const user = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
  });

  if (!user) {
    console.error("❌ No SUPER_ADMIN user found in database. Run seed first: npm run db:seed");
    process.exit(1);
  }

  const passwordHash = createHash("sha256").update(newPassword).digest("hex");

  // Update user email if provided
  await prisma.user.update({
    where: { id: user.id },
    data: {
      email: newEmail.toLowerCase().trim(),
      isActive: true,
    },
  });

  // Upsert password
  await prisma.userPassword.upsert({
    where: { userId: user.id },
    update: { passwordHash },
    create: { userId: user.id, passwordHash },
  });

  console.log(`\n✅ Super Admin credentials updated successfully!`);
  console.log(`   Email:    ${newEmail}`);
  console.log(`   Password: ${newPassword}`);
}

resetAdmin()
  .catch((err) => {
    console.error("❌ Failed to reset credentials:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
