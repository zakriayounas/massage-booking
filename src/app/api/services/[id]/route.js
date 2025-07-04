import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Get service by ID
export async function GET(request, { params }) {
    try {
        const { id } = params;
        const serviceId = parseInt(id);

        if (isNaN(serviceId)) {
            return NextResponse.json({ error: 'Invalid service ID.' }, { status: 400 });
        }

        const service = await prisma.service.findUnique({
            where: { id: serviceId },
            include: {
                service_provider: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            }
                        }
                    }
                }
            }
        });

        if (!service) {
            return NextResponse.json({ error: 'Service not found.' }, { status: 404 });
        }

        return NextResponse.json({ service });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

// PUT - Update service
export async function PUT(request, { params }) {
    try {
        const { id } = params;
        const serviceId = parseInt(id);

        if (isNaN(serviceId)) {
            return NextResponse.json({ error: 'Invalid service ID.' }, { status: 400 });
        }

        // Get user info from headers (set by middleware)
        const user_role = request.headers.get('x-user-role');
        const service_provider_id = request.headers.get('x-service-provider-id');

        if (!user_role) {
            return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
        }

        // Only service providers can update services
        if (user_role !== 'SERVICE_PROVIDER') {
            return NextResponse.json({ error: 'Only service providers can update services.' }, { status: 403 });
        }

        // Check if service belongs to the authenticated service provider
        const existingService = await prisma.service.findUnique({
            where: { id: serviceId }
        });

        if (!existingService) {
            return NextResponse.json({ error: 'Service not found.' }, { status: 404 });
        }

        if (existingService.service_provider_id !== parseInt(service_provider_id)) {
            return NextResponse.json({ error: 'You can only update your own services.' }, { status: 403 });
        }

        const {
            name,
            description,
            price,
            duration,
            calendar_color,
            status
        } = await request.json();

        const updateData = {};
        if (name) updateData.name = name;
        if (description) updateData.description = description;
        if (price) updateData.price = parseFloat(price);
        if (duration) updateData.duration = parseInt(duration);
        if (calendar_color !== undefined) updateData.calendar_color = calendar_color;
        if (status) updateData.status = status;

        const service = await prisma.service.update({
            where: { id: serviceId },
            data: updateData,
            include: {
                service_provider: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            }
                        }
                    }
                }
            }
        });

        return NextResponse.json({ service, message: 'Service updated successfully.' });
    } catch (error) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Service not found.' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

// DELETE - Delete service
export async function DELETE(request, { params }) {
    try {
        const { id } = params;
        const serviceId = parseInt(id);

        if (isNaN(serviceId)) {
            return NextResponse.json({ error: 'Invalid service ID.' }, { status: 400 });
        }

        // Get user info from headers (set by middleware)
        const user_role = request.headers.get('x-user-role');
        const service_provider_id = request.headers.get('x-service-provider-id');

        if (!user_role) {
            return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
        }

        // Only service providers can delete services
        if (user_role !== 'SERVICE_PROVIDER') {
            return NextResponse.json({ error: 'Only service providers can delete services.' }, { status: 403 });
        }

        // Check if service belongs to the authenticated service provider
        const existingService = await prisma.service.findUnique({
            where: { id: serviceId }
        });

        if (!existingService) {
            return NextResponse.json({ error: 'Service not found.' }, { status: 404 });
        }

        if (existingService.service_provider_id !== parseInt(service_provider_id)) {
            return NextResponse.json({ error: 'You can only delete your own services.' }, { status: 403 });
        }

        await prisma.service.delete({
            where: { id: serviceId },
        });

        return NextResponse.json({ message: 'Service deleted successfully.' });
    } catch (error) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Service not found.' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
} 