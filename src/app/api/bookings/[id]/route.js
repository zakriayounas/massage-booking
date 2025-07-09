import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Get booking by ID
export async function GET(request, { params }) {
    try {
        const { id } = params;
        const bookingId = parseInt(id);

        if (isNaN(bookingId)) {
            return NextResponse.json({ error: 'Invalid booking ID.' }, { status: 400 });
        }

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
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

        if (!booking) {
            return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
        }

        return NextResponse.json({ booking });
    } catch (error) {
        const errorMsg = error?.message || error?.toString() || JSON.stringify(error) || 'Internal server error.';
        return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
    }
}

// PUT - Update booking
export async function PUT(request, { params }) {
    try {
        const { id } = params;
        const bookingId = parseInt(id);

        if (isNaN(bookingId)) {
            return NextResponse.json({ error: 'Invalid booking ID.' }, { status: 400 });
        }

        const {
            date,
            status
        } = await request.json();

        const updateData = {};
        if (date) updateData.date = new Date(date);
        if (status) updateData.status = status;

        // If date is being updated, check for conflicts
        if (date) {
            const booking = await prisma.booking.findUnique({
                where: { id: bookingId },
                include: {
                    service: {
                        select: {
                            duration: true
                        }
                    }
                }
            });

            if (!booking) {
                return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
            }

            const newBookingDate = new Date(date);
            const newBookingEndTime = new Date(newBookingDate.getTime() + booking.service.duration * 60000);

            // Check for time conflicts with other bookings
            const existingBookings = await prisma.booking.findMany({
                where: {
                    service_provider_id: booking.service_provider_id,
                    id: {
                        not: bookingId
                    },
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

            const hasConflict = existingBookings.some(existingBooking => {
                const existingStart = existingBooking.date;
                const existingEnd = new Date(existingStart.getTime() + existingBooking.service.duration * 60000);

                return (newBookingDate < existingEnd && newBookingEndTime > existingStart);
            });

            if (hasConflict) {
                return NextResponse.json({
                    error: 'Time slot is not available. Please choose a different time.'
                }, { status: 409 });
            }
        }

        const updatedBooking = await prisma.booking.update({
            where: { id: bookingId },
            data: updateData,
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

        return NextResponse.json({ booking: updatedBooking, message: 'Booking updated successfully.' });
    } catch (error) {
        if (error.code === 'P2025') {
            return NextResponse.json({ success: false, message: 'Booking not found.' }, { status: 404 });
        }
        const errorMsg = error?.message || error?.toString() || JSON.stringify(error) || 'Internal server error.';
        return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
    }
}

// DELETE - Delete booking
export async function DELETE(request, { params }) {
    try {
        const { id } = params;
        const bookingId = parseInt(id);

        if (isNaN(bookingId)) {
            return NextResponse.json({ error: 'Invalid booking ID.' }, { status: 400 });
        }

        await prisma.booking.delete({
            where: { id: bookingId },
        });

        return NextResponse.json({ message: 'Booking deleted successfully.' });
    } catch (error) {
        if (error.code === 'P2025') {
            return NextResponse.json({ success: false, message: 'Booking not found.' }, { status: 404 });
        }
        const errorMsg = error?.message || error?.toString() || JSON.stringify(error) || 'Internal server error.';
        return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
    }
} 