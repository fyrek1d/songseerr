const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findFirst();
  if (existing) {
    console.log("Users already exist, skipping seed.");
    return;
  }

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin12345";
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await prisma.user.create({
    data: {
      username: process.env.SEED_ADMIN_USERNAME || "admin",
      email: process.env.SEED_ADMIN_EMAIL || "admin@localhost",
      hashedPassword,
      role: "admin",
    },
  });

  await prisma.appSettings.upsert({
    where: { id: "app" },
    update: {},
    create: { id: "app", settings: "{}" },
  });

  console.log(
    `Seeded admin user: ${process.env.SEED_ADMIN_USERNAME || "admin"} / ${adminPassword}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());