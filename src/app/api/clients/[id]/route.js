import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

// GET - Get client by ID
export async function GET(request, { params }) {
    try {
        const { id } = params;
        const clientId = parseInt(id);

        if (isNaN(clientId)) {
            return NextResponse.json({ error: 'Invalid client ID.' }, { status: 400 });
        }

        const client = await prisma.user.findFirst({
            where: {
                id: clientId,
                role: 'CLIENT'
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

        if (!client) {
            return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
        }

        return NextResponse.json({ client });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

// PUT - Update client
export async function PUT(request, { params }) {
    try {
        const { id } = params;
        const clientId = parseInt(id);

        if (isNaN(clientId)) {
            return NextResponse.json({ error: 'Invalid client ID.' }, { status: 400 });
        }

        const {
            email,
            password,
            name,
            date_of_birth,
            phone,
            profile_image,
            status
        } = await request.json();

        const updateData = {};
        if (email) updateData.email = email;
        if (name) updateData.name = name;
        if (date_of_birth) updateData.date_of_birth = new Date(date_of_birth);
        if (phone !== undefined) updateData.phone = phone;
        if (profile_image !== undefined) updateData.profile_image = profile_image;
        if (status) updateData.status = status;
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const client = await prisma.user.update({
            where: {
                id: clientId,
                role: 'CLIENT'
            },
            data: updateData,
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

        return NextResponse.json({ client, message: 'Client updated successfully.' });
    } catch (error) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

// DELETE - Delete client
export async function DELETE(request, { params }) {
    try {
        const { id } = params;
        const clientId = parseInt(id);

        if (isNaN(clientId)) {
            return NextResponse.json({ error: 'Invalid client ID.' }, { status: 400 });
        }

        await prisma.user.delete({
            where: {
                id: clientId,
                role: 'CLIENT'
            },
        });

        return NextResponse.json({ message: 'Client deleted successfully.' });
    } catch (error) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
} 