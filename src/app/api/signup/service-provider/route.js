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
        const ethnicity = formData.get('ethnicity');
        const hair_color = formData.get('hair_color');
        const experience_years = formData.get('experience_years');
        const certifications = formData.get('certifications');
        const specialties = formData.get('specialties');
        const address = formData.get('address');
        const imageFile = formData.get('profile_image');

        // Validate required fields
        if (!email || !password || !name) {
            return NextResponse.json({ success: false, message: 'Email, password, and name are required.' }, { status: 400 });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({ success: false, message: 'User with this email already exists.' }, { status: 400 });
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
            return NextResponse.json({ success: false, message: error.message }, { status: 400 });
        }

        // Create user and service provider in a transaction
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    role: 'SERVICE_PROVIDER',
                    date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
                    phone,
                    profile_color,
                    profile_image,
                    status: 'active',
                },
            });

            const serviceProvider = await tx.serviceProvider.create({
                data: {
                    user_id: user.id,
                    ethnicity,
                    hair_color,
                    experience_years: experience_years ? parseInt(experience_years) : null,
                    certifications,
                    specialties,
                    address,
                },
            });

            return { user, serviceProvider };
        });

        // Remove password from response
        const { password: _, ...userWithoutPassword } = result.user;

        // Override profile_image with full path in response
        const userWithProfileUrl = {
            ...userWithoutPassword,
            profile_image: getImageUrl(userWithoutPassword.profile_image)
        };

        return NextResponse.json({ success: true, message: 'Service provider created successfully.', data: { user: { ...userWithProfileUrl, ...result.serviceProvider } } }, { status: 201 });

    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 });
    }
} 