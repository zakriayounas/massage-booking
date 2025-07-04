import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Get service provider by ID
export async function GET(request, { params }) {
    try {
        const { id } = params;
        const serviceProviderId = parseInt(id);

        if (isNaN(serviceProviderId)) {
            return NextResponse.json({ error: 'Invalid service provider ID.' }, { status: 400 });
        }

        const serviceProvider = await prisma.serviceProvider.findUnique({
            where: { id: serviceProviderId },
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
                        status: true,
                    }
                },
                gallery_images: true
            }
        });

        if (!serviceProvider) {
            return NextResponse.json({ error: 'Service provider not found.' }, { status: 404 });
        }

        // Map gallery image filenames to public URLs
        const galleryImages = (serviceProvider.gallery_images || []).map(img => ({
            id: img.id,
            filename: img.filename,
            url: `/uploads/${img.filename}`,
            created_at: img.created_at
        }));

        return NextResponse.json({
            ...serviceProvider,
            gallery_images: galleryImages
        });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

// PUT - Update service provider
export async function PUT(request, { params }) {
    try {
        const { id } = params;
        const serviceProviderId = parseInt(id);

        if (isNaN(serviceProviderId)) {
            return NextResponse.json({ error: 'Invalid service provider ID.' }, { status: 400 });
        }

        const {
            phone,
            ethnicity,
            hair_color,
            experience_years,
            certifications,
            specialties,
            address
        } = await request.json();

        const updateData = {};
        if (phone !== undefined) updateData.phone = phone;
        if (ethnicity !== undefined) updateData.ethnicity = ethnicity;
        if (hair_color !== undefined) updateData.hair_color = hair_color;
        if (experience_years !== undefined) updateData.experience_years = experience_years ? parseInt(experience_years) : null;
        if (certifications !== undefined) updateData.certifications = certifications;
        if (specialties !== undefined) updateData.specialties = specialties;
        if (address !== undefined) updateData.address = address;

        const serviceProvider = await prisma.serviceProvider.update({
            where: { id: serviceProviderId },
            data: updateData,
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

        return NextResponse.json({ serviceProvider, message: 'Service provider updated successfully.' });
    } catch (error) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Service provider not found.' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

// DELETE - Delete service provider
export async function DELETE(request, { params }) {
    try {
        const { id } = params;
        const serviceProviderId = parseInt(id);

        if (isNaN(serviceProviderId)) {
            return NextResponse.json({ error: 'Invalid service provider ID.' }, { status: 400 });
        }

        await prisma.serviceProvider.delete({
            where: { id: serviceProviderId },
        });

        return NextResponse.json({ message: 'Service provider deleted successfully.' });
    } catch (error) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Service provider not found.' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
} 