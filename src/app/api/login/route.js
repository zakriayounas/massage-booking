import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { SignJWT } from 'jose';

export async function POST(request) {
    try {
        const { email, password } = await request.json();
        if (!email || !password) {
            return NextResponse.json({ success: false, message: 'Email and password are required.' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                service_provider: true,
            },
        });

        if (!user) {
            return NextResponse.json({ success: false, message: 'Invalid credentials.' }, { status: 401 });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return NextResponse.json({ success: false, message: 'Invalid credentials.' }, { status: 401 });
        }

        // Create JWT payload
        const payload = {
            user_id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
        };

        // Add service provider ID if user is a service provider
        if (user.role === 'SERVICE_PROVIDER' && user.service_provider) {
            payload.service_provider_id = user.service_provider.id;
        }

        // Generate JWT token
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
        const token = await new SignJWT(payload)
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(secret);

        // Remove password from user object before returning
        const { password: _, ...userWithoutPassword } = user;

        // Create response
        const response = NextResponse.json({
            success: true,
            message: 'Login successful',
            data: { user: userWithoutPassword }
        });

        // Set JWT token as HTTP-only cookie
        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60, // 24 hours
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 });
    }
} 