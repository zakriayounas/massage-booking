// Generate a random profile color
export function generateProfileColor() {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
        '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
        '#A9CCE3', '#F9E79F', '#D5A6BD', '#A2D9CE', '#FAD7A0',
        '#D2B4DE', '#AED6F1', '#FADBD8', '#D5F4E6', '#FDEBD0',
        '#E8DAEF', '#D1F2EB', '#FCF3CF', '#FADBD8', '#D5F4E6'
    ];

    return colors[Math.floor(Math.random() * colors.length)];
}

// Save image to local storage (for profile or gallery)
export async function saveImage(imageFile) {
    if (!imageFile || imageFile.size === 0) {
        return null;
    }

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
        throw new Error('File must be an image.');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (imageFile.size > maxSize) {
        throw new Error('File size must be less than 5MB.');
    }

    // Create upload directory if it doesn't exist
    const { writeFile, mkdir } = await import('fs/promises');
    const { join } = await import('path');
    const { existsSync } = await import('fs');

    const uploadDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = imageFile.name.split('.').pop();
    const fileName = `img_${timestamp}_${randomString}.${fileExtension}`;
    const filePath = join(uploadDir, fileName);

    // Convert file to buffer and save
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return only the filename
    return fileName;
}

// Get public URL for an uploaded image
export function getImageUrl(filename) {
    if (!filename) return null;
    return `/uploads/${filename}`;
} 