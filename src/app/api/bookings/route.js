import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - List all bookings (for admin/service provider)
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('user_id');
        const serviceProviderId = searchParams.get('service_provider_id');

        let whereClause = {};

        if (userId) {
            whereClause.user_id = parseInt(userId);
        }

        if (serviceProviderId) {
            whereClause.service_provider_id = parseInt(serviceProviderId);
        }

        const bookings = await prisma.booking.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    }
                },
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
                },
                service: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        price: true,
                        duration: true,
                        calendar_color: true,
                    }
                }
            },
            orderBy: {
                date: 'asc'
            }
        });

        return NextResponse.json({ bookings });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

// POST - Create new booking
export async function POST(request) {
    try {
        // Get user info from headers (set by middleware)
        const user_id = request.headers.get('x-user-id');
        const user_role = request.headers.get('x-user-role');

        if (!user_id || !user_role) {
            return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
        }

        // Only clients can create bookings
        if (user_role !== 'CLIENT') {
            return NextResponse.json({ error: 'Only clients can create bookings.' }, { status: 403 });
        }

        const {
            service_id,
            service_provider_id,
            date,
            status = 'pending'
        } = await request.json();

        if (!service_id || !service_provider_id || !date) {
            return NextResponse.json({ error: 'Service ID, service provider ID, and date are required.' }, { status: 400 });
        }

        // Get the service to check duration
        const service = await prisma.service.findUnique({
            where: { id: parseInt(service_id) }
        });

        if (!service) {
            return NextResponse.json({ error: 'Service not found.' }, { status: 404 });
        }

        const bookingDate = new Date(date);
        const bookingEndTime = new Date(bookingDate.getTime() + service.duration * 60000);

        // Check for time conflicts
        const existingBookings = await prisma.booking.findMany({
            where: {
                service_provider_id: parseInt(service_provider_id),
                status: {
                    not: 'cancelled'
                }
            },
            include: {
                service: {
                    select: {
                        duration: true
                    }
                }
            }
        });

        // Check for conflicts
        const hasConflict = existingBookings.some(existingBooking => {
            const existingStart = existingBooking.date;
            const existingEnd = new Date(existingStart.getTime() + existingBooking.service.duration * 60000);

            // Check if the new booking overlaps with existing booking
            return (bookingDate < existingEnd && bookingEndTime > existingStart);
        });

        if (hasConflict) {
            return NextResponse.json({
                error: 'Time slot is not available. Please choose a different time.'
            }, { status: 409 });
        }

        // Create the booking
        const booking = await prisma.booking.create({
            data: {
                user_id: parseInt(user_id),
                service_id: parseInt(service_id),
                service_provider_id: parseInt(service_provider_id),
                date: bookingDate,
                status,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    }
                },
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
                },
                service: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        price: true,
                        duration: true,
                        calendar_color: true,
                    }
                }
            }
        });

        return NextResponse.json({ booking, message: 'Booking created successfully.' }, { status: 201 });
    } catch (error) {
        console.error('Booking error:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
} 