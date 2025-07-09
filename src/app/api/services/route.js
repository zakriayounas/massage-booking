import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - List all services
export async function GET() {
    try {
        const services = await prisma.service.findMany({
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

        return NextResponse.json({ services });
    } catch (error) {
        const errorMsg = error?.message || error?.toString() || JSON.stringify(error) || 'Internal server error.';
        return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
    }
}

// POST - Create new service
export async function POST(request) {
    try {
        // Get user info from headers (set by middleware)
        const user_id = request.headers.get('x-user-id');
        const user_role = request.headers.get('x-user-role');
        const service_provider_id = request.headers.get('x-service-provider-id');

        if (!user_id || !user_role) {
            return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
        }

        // Only service providers can create services
        if (user_role !== 'SERVICE_PROVIDER') {
            return NextResponse.json({ error: 'Only service providers can create services.' }, { status: 403 });
        }

        if (!service_provider_id) {
            return NextResponse.json({ error: 'Service provider profile not found.' }, { status: 400 });
        }

        const {
            name,
            description,
            price,
            duration = 60,
            calendar_color,
            status = 'active'
        } = await request.json();

        if (!name || !description || !price) {
            return NextResponse.json({ error: 'Name, description, and price are required.' }, { status: 400 });
        }

        const service = await prisma.service.create({
            data: {
                name,
                description,
                price: parseFloat(price),
                duration: parseInt(duration),
                calendar_color,
                status,
                service_provider_id: parseInt(service_provider_id),
            },
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

        return NextResponse.json({ service, message: 'Service created successfully.' }, { status: 201 });
    } catch (error) {
        const errorMsg = error?.message || error?.toString() || JSON.stringify(error) || 'Internal server error.';
        return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
    }
} 