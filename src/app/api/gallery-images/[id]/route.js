import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { join } from 'path';
import { unlink } from 'fs/promises';

// DELETE - Delete a gallery image by id (only by the owner)
export async function DELETE(request, { params }) {
    try {
        const { id } = params;
        const service_provider_id = request.headers.get('x-service-provider-id');
        if (!service_provider_id) {
            return NextResponse.json({ error: 'Service provider authentication required.' }, { status: 401 });
        }
        const imageId = parseInt(id);
        if (isNaN(imageId)) {
            return NextResponse.json({ error: 'Invalid image ID.' }, { status: 400 });
        }
        // Find the image and check ownership
        const image = await prisma.galleryImage.findUnique({ where: { id: imageId } });
        if (!image) {
            return NextResponse.json({ error: 'Gallery image not found.' }, { status: 404 });
        }
        if (image.service_provider_id !== parseInt(service_provider_id)) {
            return NextResponse.json({ error: 'You can only delete your own gallery images.' }, { status: 403 });
        }
        // Delete the file from uploads folder
        const filePath = join(process.cwd(), 'public', 'uploads', image.filename);
        try {
            await unlink(filePath);
        } catch (e) {
            // File might not exist, ignore error
        }
        // Delete the record from DB
        await prisma.galleryImage.delete({ where: { id: imageId } });
        return NextResponse.json({ message: 'Gallery image deleted successfully.' });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
} 