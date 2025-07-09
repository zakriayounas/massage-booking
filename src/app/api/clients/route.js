import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { generateProfileColor } from '@/lib/helpers';

// GET - List all clients (users with CLIENT role)
export async function GET() {
    try {
        const clients = await prisma.user.findMany({
            where: {
                role: 'CLIENT'
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                date_of_birth: true,
                status: true,
                phone: true,
                profile_color: true,
                profile_image: true,
                created_at: true,
                updated_at: true,
            }
        });

        return NextResponse.json({ clients });
    } catch (error) {
        const errorMsg = error?.message || error?.toString() || JSON.stringify(error) || 'Internal server error.';
        return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
    }
}

// POST - Create new client
export async function POST(request) {
    try {
        const {
            email,
            password,
            name,
            date_of_birth,
            phone,
            profile_image,
            status = 'active'
        } = await request.json();

        if (!email || !password || !name) {
            return NextResponse.json({ error: 'Email, password, and name are required.' }, { status: 400 });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({ error: 'User with this email already exists.' }, { status: 400 });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate profile color
        const profile_color = generateProfileColor();

        const client = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: 'CLIENT',
                date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
                phone,
                profile_color,
                profile_image,
                status,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                date_of_birth: true,
                status: true,
                phone: true,
                profile_color: true,
                profile_image: true,
                created_at: true,
                updated_at: true,
            }
        });

        return NextResponse.json({ client, message: 'Client created successfully.' }, { status: 201 });
    } catch (error) {
        const errorMsg = error?.message || error?.toString() || JSON.stringify(error) || 'Internal server error.';
        return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
    }
} 