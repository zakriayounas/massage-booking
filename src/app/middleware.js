import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';

const AUTH_PATHS = [
    '/api/bookings',
    '/api/services',
];


export async function middleware(request) {
    const { pathname } = request.nextUrl;
    if (request.method === "OPTIONS") {
        return new NextResponse(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
        });
    }
    // Protect specified API endpoints
    if (AUTH_PATHS.some(path => pathname.startsWith(path))) {
        const token = request.cookies.get('token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
        }

        try {
            // Verify and decode JWT token
            const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
            const { payload } = await jwtVerify(token, secret);

            // Clone the request and add user info to headers
            const requestHeaders = new Headers(request.headers);
            requestHeaders.set('x-user-id', payload.user_id.toString());
            requestHeaders.set('x-user-role', payload.role);
            requestHeaders.set('x-user-email', payload.email);
            requestHeaders.set('x-user-name', payload.name);

            // Add service provider ID if available
            if (payload.service_provider_id) {
                requestHeaders.set('x-service-provider-id', payload.service_provider_id.toString());
            }

            // Return the request with updated headers
            const response = NextResponse.next({
                request: {
                    headers: requestHeaders,
                },
            });
            // --- CORS DEMO: Add CORS headers here ---
            return response;
        } catch (e) {
            return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
        }
    }
    // --- CORS DEMO: Add CORS headers here ---
    const response = NextResponse.next();
    return response
}

export const config = {
    matcher: ['/api/'],
}; 