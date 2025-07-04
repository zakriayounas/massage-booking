import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
                        status: true,
                    }
                }
            }
        });

        return NextResponse.json({ serviceProviders });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

// POST - Create new service provider
export async function POST(request) {
    try {
        const {
            user_id,
            phone,
            ethnicity,
            hair_color,
            experience_years,
            certifications,
            specialties,
            address
        } = await request.json();

        if (!user_id) {
            return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
        }

        // Check if user exists and is a service provider
        const user = await prisma.user.findUnique({
            where: { id: parseInt(user_id) },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        if (user.role !== 'SERVICE_PROVIDER') {
            return NextResponse.json({ error: 'User must be a service provider.' }, { status: 400 });
        }

        // Check if service provider already exists for this user
        const existingServiceProvider = await prisma.serviceProvider.findUnique({
            where: { user_id: parseInt(user_id) },
        });

        if (existingServiceProvider) {
            return NextResponse.json({ error: 'Service provider already exists for this user.' }, { status: 400 });
        }

        const serviceProvider = await prisma.serviceProvider.create({
            data: {
                user_id: parseInt(user_id),
                phone,
                ethnicity,
                hair_color,
                experience_years: experience_years ? parseInt(experience_years) : null,
                certifications,
                specialties,
                address,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        date_of_birth: true,
                        status: true,
                        created_at: true,
                        updated_at: true,
                    }
                }
            }
        });

        return NextResponse.json({ serviceProvider, message: 'Service provider created successfully.' }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
} 