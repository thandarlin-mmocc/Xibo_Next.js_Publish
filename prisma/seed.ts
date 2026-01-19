
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const schoolPassword = await bcrypt.hash('school123', 10)
  const adminPassword = await bcrypt.hash('admin123', 10)

  // Create School
  const school = await prisma.school.upsert({
    where: { code: 'SCH001' },
    update: {},
    create: {
      code: 'SCH001',
      name: 'Naha Elementary School',
      passwordHash: schoolPassword,
    },
  })

  // Create Admin User
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      role: 'admin',
      username: 'admin',
      passwordHash: adminPassword,
    },
  })

  console.log({ school, admin })

  // Create Artworks
  await prisma.artwork.createMany({
    data: [
      {
        schoolId: school.id,
        title: 'ひまわり畑',
        nickname: 'はなこ',
        imagePath: 'https://placehold.co/600x400/orange/white?text=Sunflower',
        status: 'pending',
      },
      {
        schoolId: school.id,
        title: '未来の都市',
        nickname: 'ケンタ',
        imagePath: 'https://placehold.co/600x400/blue/white?text=Future+City',
        status: 'approved',
        approvedAt: new Date(),
      },
      {
        schoolId: school.id,
        title: '謎の生物',
        nickname: 'ユウキ',
        imagePath: 'https://placehold.co/600x400/red/white?text=Mystery',
        status: 'rejected',
        rejectReason: '著作権に抵触する恐れがあります',
      }
    ]
  })
  console.log('Seeded sample artworks')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
