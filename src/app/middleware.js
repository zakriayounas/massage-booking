import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_PATHS = [
    '/api/bookings',
    '/api/services',
];

export async function middleware(request) {
    const { pathname } = request.nextUrl;

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
            return NextResponse.next({
                request: {
                    headers: requestHeaders,
                },
            });
        } catch (e) {
            return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
        }
    }
    return NextResponse.next();
}

export const config = {
    matcher: ['/api/bookings/:path*', '/api/services/:path*'],
}; 