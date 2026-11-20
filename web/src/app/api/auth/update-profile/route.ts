import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';

export async function PUT(req: Request) {
    try {
        const { id, name, email, password, newPassword, photoUrl } = await req.json();

        if (!id) {
            return NextResponse.json(
                { message: 'User ID is required' },
                { status: 400 }
            );
        }

        // Get current user
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;

        if (!user) {
            return NextResponse.json(
                { message: 'User not found' },
                { status: 404 }
            );
        }

        let hashedPassword = user.password;
        if (newPassword) {
            hashedPassword = await bcrypt.hash(newPassword, 10);
        }

        // Update user
        const update = db.prepare(`
            UPDATE users 
            SET name = ?, email = ?, password = ?, photo = ?
            WHERE id = ?
        `);

        update.run(name || user.name, email || user.email, hashedPassword, photoUrl || user.photo, id);

        return NextResponse.json(
            { message: 'Profile updated successfully' },
            { status: 200 }
        );

    } catch (error) {
        console.error('Update profile error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
