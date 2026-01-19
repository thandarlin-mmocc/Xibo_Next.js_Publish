
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/session'
import * as bcrypt from 'bcryptjs'
import { cookies } from 'next/headers' // Correct way to set cookies in App Router
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { type, credentials } = body // type: 'teacher' | 'admin'

        let user = null
        let role = ''
        let schoolId = null

        if (type === 'teacher') {
            const school = await prisma.school.findUnique({
                where: { code: credentials.code },
            })
            if (!school || !await bcrypt.compare(credentials.password, school.passwordHash)) {
                return NextResponse.json({ error: 'Invalid school code or password' }, { status: 401 })
            }
            user = { id: school.id, name: school.name }
            role = 'teacher'
            schoolId = school.id
        } else if (type === 'admin') {
            const admin = await prisma.user.findUnique({
                where: { username: credentials.username },
            })
            if (!admin || !await bcrypt.compare(credentials.password, admin.passwordHash)) {
                return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 })
            }
            user = { id: admin.id, name: 'Administrator' }
            role = 'admin'
            schoolId = null
        } else {
            return NextResponse.json({ error: 'Invalid login type' }, { status: 400 })
        }

        // Create session
        const session = await encrypt({ id: user.id, role, schoolId, name: user.name })

        // Set cookie
        const cookieStore = await cookies()
        cookieStore.set('session', session, {
            httpOnly: true,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
        })

        return NextResponse.json({ success: true, user: { role, name: user.name } })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
