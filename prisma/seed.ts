import { PrismaClient, UserRole, ArtworkStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Start seeding...");

  // For Password Hashing
  const adminPassword = await bcrypt.hash("admin123", 10);
  const teacherPassword = await bcrypt.hash("teacher123", 10);
  const airportAdminPassword = await bcrypt.hash("airportadmin123", 10);
  const opsPassword = await bcrypt.hash("ops123", 10);

  // Create a Tenant (School)
  const schoolTenant = await prisma.tenant.upsert({
    where: { id: "cl-school-001" }, // Fixed ID for seeding consistency
    update: { locale: "ja", timezone: "Asia/Tokyo" },
    create: {
      id: "cl-school-001",
      name: "Naha Elementary School",
      type: "SCHOOL",
      locale: "ja",
      timezone: "Asia/Tokyo",
    },
  });

  // Create a Tenant (Airport)
  const airportTenant = await prisma.tenant.upsert({
    where: { id: "cl-airport-001" }, // Fixed ID for seeding consistency
    update: { locale: "en", timezone: "Asia/Tokyo" },
    create: {
      id: "cl-airport-001",
      name: "Naha Airport",
      type: "AIRPORT",
      locale: "en",
      timezone: "Asia/Tokyo",
    },
  });

  // Create User Accounts for Global Admin and School Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@occ.co.jp" },
    update: {},
    create: {
      email: "admin@occ.co.jp",
      name: "System Admin",
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  // Create a Teacher User (Assigned to School Tenant)
  const teacher = await prisma.user.upsert({
    where: { email: "teacher@naha.edu" },
    update: {},
    create: {
      email: "teacher@naha.edu",
      name: "Sensei Tanaka",
      passwordHash: teacherPassword,
      role: UserRole.TEACHER,
      tenantId: schoolTenant.id,
      isActive: true,
    },
  });

  // Create an Airport Admin User (Assigned to Airport Tenant)
  const airportAdmin = await prisma.user.upsert({
    where: { email: "admin@naha-airport.jp" },
    update: {},
    create: {
      email: "admin@naha-airport.jp",
      name: "Airport Admin",
      passwordHash: airportAdminPassword,
      role: UserRole.AIRPORT_ADMIN,
      tenantId: airportTenant.id,
      isActive: true,
    },
  });

  // Create an Ops User (Assigned to Airport Tenant)
  const ops = await prisma.user.upsert({
    where: { email: "ops@naha-airport.jp" },
    update: {},
    create: {
      email: "ops@naha-airport.jp",
      name: "Ops Staff",
      passwordHash: opsPassword,
      role: UserRole.OPS,
      tenantId: airportTenant.id,
      isActive: true,
    },
  });

  // Create Sample Artwork Submission
  await prisma.artwork.create({
    data: {
      title: "Summer Flowers",
      description: "Painted by Grade 4 students",
      imagePath: "/uploads/sample-art.jpg",
      status: ArtworkStatus.PENDING,
      tenantId: schoolTenant.id,
      width: 1920,
      height: 1080,
      fileSize: 500000, // 0.5 MB
    },
  });

  console.log({
    message: "✅ Seeding finished.",
    admin: admin.email,
    school: schoolTenant.name,
    teacher: teacher.email,
    airport: airportTenant.name,
    airportAdmin: airportAdmin.email,
    ops: ops.email,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
