import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { saveImage, getImageUrl } from '@/lib/helpers';

// GET - Get service provider by ID
export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const serviceProviderId = parseInt(id);

        if (isNaN(serviceProviderId)) {
            return NextResponse.json({
                success: false,
                message: 'Invalid service provider ID.'
            }, { status: 400 })
        }
        const serviceProvider = await prisma.serviceProvider.findFirst({
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
                        duration: true,
                        calendar_color: true,
                        status: true,
                    }
                },
                GalleryImage: true
            }
        });
        if (!serviceProvider) {
            return NextResponse.json({
                success: false,
                message: 'Service provider not found.'
            }, { status: 404 });
        }

        // Map gallery image filenames to public URLs
        const galleryImages = (serviceProvider.GalleryImage || []).map(img => ({
            id: img.id,
            filename: img.filename,
            url: getImageUrl(img.filename),
            created_at: img.created_at
        }));

        // Flatten the response structure
        const { user, ...providerData } = serviceProvider;
        const { id: userObjId, ...restUser } = user; // exclude id here

        const responseData = {
            ...providerData,
            ...restUser,
            profile_image: getImageUrl(user.profile_image),
            gallery_images: galleryImages
        };


        return NextResponse.json({
            success: true,
            data: responseData
        });
    } catch (error) {
        console.error('Get service provider error:', error);
        const errorMsg = error?.message || error?.toString() || JSON.stringify(error) || 'Internal server error.';
        return NextResponse.json({
            success: false,
            message: errorMsg
        }, { status: 500 });
    }
}

// PUT - Update service provider (supports both JSON and FormData)
export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const serviceProviderId = parseInt(id);

        if (isNaN(serviceProviderId)) {
            return NextResponse.json({
                success: false,
                message: 'Invalid service provider ID.'
            }, { status: 400 });
        }

        // Check if service provider exists
        const existingServiceProvider = await prisma.serviceProvider.findUnique({
            where: { id: serviceProviderId },
            include: { user: true }
        });

        if (!existingServiceProvider) {
            return NextResponse.json({
                success: false,
                message: 'Service provider not found.'
            }, { status: 404 })
        }

        let updateData = {};
        let userUpdateData = {};
        let profile_image = null;

        // Check if request is FormData (for file uploads) or JSON
        const contentType = request.headers.get('content-type');

        if (contentType && contentType.includes('multipart/form-data')) {
            // Handle FormData (with potential file upload)
            const formData = await request.formData();

            // User fields
            const name = formData.get('name');
            const email = formData.get('email');
            const phone = formData.get('phone');
            const date_of_birth = formData.get('date_of_birth');
            const password = formData.get('password');
            const imageFile = formData.get('profile_image');

            // Service provider fields
            const ethnicity = formData.get('ethnicity');
            const hair_color = formData.get('hair_color');
            const experience_years = formData.get('experience_years');
            const certifications = formData.get('certifications');
            const specialties = formData.get('specialties');
            const address = formData.get('address');

            // Handle profile image upload
            if (imageFile && imageFile.size > 0) {
                try {
                    const filename = await saveImage(imageFile);
                    if (filename) profile_image = filename;
                } catch (error) {
                    return NextResponse.json({
                        success: false,
                        message: error.message
                    }, { status: 400 });
                }
            }

            // Prepare user update data
            if (name !== null) userUpdateData.name = name;
            if (email !== null) userUpdateData.email = email;
            if (phone !== null) userUpdateData.phone = phone;
            if (date_of_birth !== null) userUpdateData.date_of_birth = date_of_birth ? new Date(date_of_birth) : null;
            if (profile_image !== null) userUpdateData.profile_image = profile_image;
            if (password !== null && password !== '') {
                userUpdateData.password = await bcrypt.hash(password, 10);
            }

            // Prepare service provider update data
            if (ethnicity !== null) updateData.ethnicity = ethnicity;
            if (hair_color !== null) updateData.hair_color = hair_color;
            if (experience_years !== null) updateData.experience_years = experience_years ? parseInt(experience_years) : null;
            if (certifications !== null) updateData.certifications = certifications;
            if (specialties !== null) updateData.specialties = specialties;
            if (address !== null) updateData.address = address;

        } else {
            // Handle JSON data
            const body = await request.json();

            // User fields
            const { name, email, phone, date_of_birth, password } = body;

            // Service provider fields
            const { ethnicity, hair_color, experience_years, certifications, specialties, address } = body;

            // Prepare user update data
            if (name !== undefined) userUpdateData.name = name;
            if (email !== undefined) userUpdateData.email = email;
            if (phone !== undefined) userUpdateData.phone = phone;
            if (date_of_birth !== undefined) userUpdateData.date_of_birth = date_of_birth ? new Date(date_of_birth) : null;
            if (password !== undefined && password !== '') {
                userUpdateData.password = await bcrypt.hash(password, 10);
            }

            // Prepare service provider update data
            if (ethnicity !== undefined) updateData.ethnicity = ethnicity;
            if (hair_color !== undefined) updateData.hair_color = hair_color;
            if (experience_years !== undefined) updateData.experience_years = experience_years ? parseInt(experience_years) : null;
            if (certifications !== undefined) updateData.certifications = certifications;
            if (specialties !== undefined) updateData.specialties = specialties;
            if (address !== undefined) updateData.address = address;
        }

        // Update both user and service provider in a transaction
        const result = await prisma.$transaction(async (tx) => {
            let updatedUser = existingServiceProvider.user;
            let updatedServiceProvider = existingServiceProvider;

            // Update user if there are user fields to update
            if (Object.keys(userUpdateData).length > 0) {
                updatedUser = await tx.user.update({
                    where: { id: existingServiceProvider.user_id },
                    data: userUpdateData,
                });
            }

            // Update service provider if there are service provider fields to update
            if (Object.keys(updateData).length > 0) {
                updatedServiceProvider = await tx.serviceProvider.update({
                    where: { id: serviceProviderId },
                    data: updateData,
                });
            }

            return { user: updatedUser, serviceProvider: updatedServiceProvider };
        });

        // Remove password from response
        const { password: _, id: userId, ...userWithoutPassword } = result.user;

        // Flatten the response structure
        const responseData = {
            ...result.serviceProvider,
            ...userWithoutPassword,
            profile_image: getImageUrl(userWithoutPassword.profile_image),
        };

        return NextResponse.json({
            success: true,
            message: 'Service provider updated successfully.',
            data: responseData
        })
    } catch (error) {
        console.error('Update service provider error:', error);
        if (error.code === 'P2025') {
            return NextResponse.json({
                success: false,
                message: 'Service provider not found.'
            }, { status: 404 })
        }
        if (error.code === 'P2002') {
            return NextResponse.json({
                success: false,
                message: 'Email already exists.'
            }, { status: 400 })
        }
        const errorMsg = error?.message || error?.toString() || JSON.stringify(error) || 'Internal server error.';
        return NextResponse.json({
            success: false,
            message: errorMsg
        }, { status: 500 });
    }
}

// DELETE - Delete service provider (and associated user)
export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        const serviceProviderId = parseInt(id);

        if (isNaN(serviceProviderId)) {
            return NextResponse.json({
                success: false,
                message: 'Invalid service provider ID.'
            }, { status: 400 })
        }

        // Get service provider with user info
        const serviceProvider = await prisma.serviceProvider.findUnique({
            where: { id: serviceProviderId },
            include: { user: true }
        });

        if (!serviceProvider) {
            return NextResponse.json({
                success: false,
                message: 'Service provider not found.'
            }, { status: 404 });
        }

        // Delete service provider and user in transaction
        await prisma.$transaction(async (tx) => {
            // Delete all related records first to avoid foreign key constraint violations

            // 1. Delete gallery images
            await tx.galleryImage.deleteMany({
                where: { service_provider_id: serviceProviderId },
            });

            // 2. Delete favorite service provider records
            await tx.favoriteServiceProvider.deleteMany({
                where: { service_provider_id: serviceProviderId },
            });

            // 3. Delete payments related to this service provider
            await tx.payment.deleteMany({
                where: { service_provider_id: serviceProviderId },
            });

            // 4. Delete bookings related to this service provider
            await tx.booking.deleteMany({
                where: { service_provider_id: serviceProviderId },
            });

            // 5. Delete services offered by this service provider
            await tx.service.deleteMany({
                where: { service_provider_id: serviceProviderId },
            });

            // 6. Now delete the service provider
            await tx.serviceProvider.delete({
                where: { id: serviceProviderId },
            });

            // 7. Finally delete the associated user
            await tx.user.delete({
                where: { id: serviceProvider.user_id },
            });
        });

        return NextResponse.json({
            success: true,
            message: 'Service provider deleted successfully.'
        });
    } catch (error) {
        console.error('Delete service provider error:', error);
        if (error.code === 'P2025') {
            return NextResponse.json({
                success: false,
                message: 'Service provider not found.'
            }, { status: 404 });
        }
        const errorMsg = error?.message || error?.toString() || JSON.stringify(error) || 'Internal server error.';
        return NextResponse.json({
            success: false,
            message: errorMsg
        }, { status: 500 });
    }
}