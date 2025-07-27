import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { generateProfileColor, saveImage, getImageUrl } from '@/lib/helpers';
// GET - List all service providers
export async function GET() {
    try {
        const serviceProviders = await prisma.serviceProvider.findMany({
            include: {
                user: {
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
                },
                services: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        price: true,
                        duration: true,
                        calendar_color: true,
                        status: true,
                    }
                }
            }
        });

        // Transform the data to include proper image URLs and flatten structure
        const transformedProviders = serviceProviders.map(provider => {
            const { user, ...providerData } = provider;
            const { id: userObjId, ...restUser } = user; // exclude id here
            return {
                ...providerData,
                ...restUser,
                profile_image: getImageUrl(user.profile_image),
            };
        });

        return NextResponse.json({
            success: true,
            data: transformedProviders
        });
    } catch (error) {
        console.error('Get service providers error:', error);
        const errorMsg = error?.message || error?.toString() || JSON.stringify(error) || 'Internal server error.';
        return NextResponse.json({
            success: false,
            message: errorMsg
        }, { status: 500 });
    }
}

// POST - Create new service provider (with user creation in transaction)
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
            return NextResponse.json({
                success: false,
                message: 'Email, password, and name are required.'
            }, { status: 400 });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({
                success: false,
                message: 'User with this email already exists.'
            }, { status: 400 });
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
            return NextResponse.json({
                success: false,
                message: error.message
            }, { status: 400 });
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
        const { password: _, id: userId, ...userWithoutPassword } = result.user;

        // Override profile_image with full path in response
        const userWithProfileUrl = {
            ...userWithoutPassword,
            profile_image: getImageUrl(userWithoutPassword.profile_image)
        };

        // Flatten the response structure
        const responseData = {
            ...result.serviceProvider,
            ...userWithProfileUrl,
        };

        return NextResponse.json({
            success: true,
            message: 'Service provider created successfully.',
            data: responseData
        }, { status: 201 });

    } catch (error) {
        console.error('Create service provider error:', error);
        return NextResponse.json({
            success: false,
            message: 'Internal server error.'
        }, { status: 500 });
    }
}