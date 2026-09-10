import { prisma } from "../src/infrastructure/db/prisma";
import { createHash } from "crypto";
import { DefaultFeatureFlags } from "../src/modules/feature-flags/feature-flags.constants";

async function seed() {
  console.log("🌱 Seeding YEH Credential Platform...");

  // ─── Organization ─────────────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: "yeh" },
    update: {},
    create: {
      name: "Youth Empowerment Hub",
      slug: "yeh",
      isActive: true,
    },
  });
  console.log(`✓ Organization: ${org.name} (${org.id})`);

  // ─── Super Admin User ─────────────────────────────────────────────────────
  const adminEmail = "admin@youthempowerment.in";
  const adminPassword = "YEH@Admin2026"; // Change immediately in production!
  const passwordHash = createHash("sha256").update(adminPassword).digest("hex");

  const admin = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: adminEmail } },
    update: {},
    create: {
      organizationId: org.id,
      email: adminEmail,
      name: "YEH Super Admin",
      role: "SUPER_ADMIN",
      emailVerified: new Date(),
    },
  });
  console.log(`✓ Admin user: ${admin.email}`);

  // Store password hash
  await prisma.userPassword.upsert({
    where: { userId: admin.id },
    update: { passwordHash },
    create: { userId: admin.id, passwordHash },
  });
  console.log(`✓ Password hash stored`);

  // ─── Feature Flags ────────────────────────────────────────────────────────
  for (const [key, { enabled, description }] of Object.entries(DefaultFeatureFlags)) {
    await prisma.featureFlag.upsert({
      where: { organizationId_key: { organizationId: org.id, key } },
      update: {},
      create: { organizationId: org.id, key, isEnabled: enabled, description },
    });
  }
  console.log(`✓ Feature flags seeded (${Object.keys(DefaultFeatureFlags).length} flags)`);

  // ─── System Settings ──────────────────────────────────────────────────────
  await prisma.systemSetting.upsert({
    where: { key: "system_mode" },
    update: {},
    create: { key: "system_mode", value: "ACTIVE", description: "System operating mode" },
  });
  console.log(`✓ System settings seeded`);

  // ─── Default Credential Types ─────────────────────────────────────────────
  const credentialTypes = [
    { code: "CERTIFICATE" as const, name: "Certificate", idPrefix: "YEH-CERT" },
    { code: "INTERNSHIP" as const, name: "Internship Certificate", idPrefix: "YEH-INT" },
    { code: "VOLUNTEER" as const, name: "Volunteer Certificate", idPrefix: "YEH-VOL" },
    { code: "PARTICIPATION" as const, name: "Participation Certificate", idPrefix: "YEH-PART" },
    { code: "APPRECIATION" as const, name: "Appreciation Certificate", idPrefix: "YEH-APPR" },
    { code: "ACHIEVEMENT" as const, name: "Achievement Award", idPrefix: "YEH-ACH" },
    { code: "LEADERSHIP" as const, name: "Leadership Certificate", idPrefix: "YEH-LEAD" },
  ];

  for (const ct of credentialTypes) {
    await prisma.credentialType.upsert({
      where: { organizationId_idPrefix: { organizationId: org.id, idPrefix: ct.idPrefix } },
      update: {},
      create: { organizationId: org.id, ...ct, isActive: true },
    });
  }
  console.log(`✓ Credential types seeded (${credentialTypes.length} types)`);

  console.log("\n✅ Seed complete!");
  console.log(`\n📋 Admin credentials:`);
  console.log(`   Email:    ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log(`\n⚠️  Change the admin password immediately in production!`);
}

seed()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
