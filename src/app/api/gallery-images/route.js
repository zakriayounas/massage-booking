import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { saveImage, getImageUrl } from '@/lib/helpers';

// GET - List all gallery images for the logged-in service provider
export async function GET(request) {
    try {
        const service_provider_id = request.headers.get('x-service-provider-id');
        if (!service_provider_id) {
            return NextResponse.json({ error: 'Service provider authentication required.' }, { status: 401 });
        }
        const images = await prisma.galleryImage.findMany({
            where: { service_provider_id: parseInt(service_provider_id) },
            orderBy: { created_at: 'desc' }
        });
        return NextResponse.json({
            images: images.map(img => ({
                id: img.id,
                filename: img.filename,
                url: getImageUrl(img.filename),
                created_at: img.created_at
            }))
        });
    } catch (error) {
        const errorMsg = error?.message || error?.toString() || JSON.stringify(error) || 'Internal server error.';
        return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
    }
}

// POST - Upload a new gallery image
export async function POST(request) {
    try {
        const service_provider_id = request.headers.get('x-service-provider-id');
        if (!service_provider_id) {
            return NextResponse.json({ error: 'Service provider authentication required.' }, { status: 401 });
        }
        const formData = await request.formData();
        const imageFile = formData.get('image');
        if (!imageFile) {
            return NextResponse.json({ error: 'No image file provided.' }, { status: 400 });
        }
        let filename;
        try {
            filename = await saveImage(imageFile);
        } catch (error) {
            const errorMsg = error?.message || error?.toString() || JSON.stringify(error) || 'Internal server error.';
            return NextResponse.json({ success: false, message: errorMsg }, { status: 400 });
        }
        const galleryImage = await prisma.galleryImage.create({
            data: {
                service_provider_id: parseInt(service_provider_id),
                filename
            }
        });
        return NextResponse.json({
            id: galleryImage.id,
            filename: galleryImage.filename,
            url: getImageUrl(galleryImage.filename),
            created_at: galleryImage.created_at,
            message: 'Gallery image uploaded successfully.'
        }, { status: 201 });
    } catch (error) {
        const errorMsg = error?.message || error?.toString() || JSON.stringify(error) || 'Internal server error.';
        return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
    }
} 