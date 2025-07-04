import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { generateProfileColor, saveImage, getImageUrl } from '@/lib/helpers';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const email = formData.get('email');
        const password = formData.get('password');
        const name = formData.get('name');
        const date_of_birth = formData.get('date_of_birth');
        const phone = formData.get('phone');
        const status = formData.get('status') || 'active';
        const imageFile = formData.get('profile_image');

        if (!email || !password || !name) {
            return NextResponse.json({ error: 'Email, password, and name are required.' }, { status: 400 });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: 'User with this email already exists.' }, { status: 400 });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate profile color
        const profile_color = generateProfileColor();

        // Handle profile image upload using helper function
        let profile_image = null;
        try {
            const filename = await saveImage(imageFile);
            if (filename) profile_image = filename;
        } catch (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: 'ADMIN',
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

        // Override profile_image with full path in response
        const userWithProfileUrl = {
            ...user,
            profile_image: getImageUrl(user.profile_image)
        };

        return NextResponse.json({ user: userWithProfileUrl, message: 'Admin created successfully.' }, { status: 201 });
    } catch (error) {
        console.error('Signup admin error:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
} 