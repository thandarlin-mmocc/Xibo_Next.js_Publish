
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
    const cookieStore = await cookies()
    cookieStore.delete('session')
    return NextResponse.redirect(new URL('/login', 'http://localhost:3000'))
}
