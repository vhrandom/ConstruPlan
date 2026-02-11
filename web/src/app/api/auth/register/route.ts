import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';

export async function POST(req: Request) {
    try {
        const { email, password, name } = await req.json();

        if (!email || !password || !name) {
            return NextResponse.json(
                { message: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Check if user already exists
        const statement = db.prepare('SELECT * FROM users WHERE email = ?');
        const existingUser = statement.get(email);

        if (existingUser) {
            return NextResponse.json(
                { message: 'User already exists' },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        const insert = db.prepare(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)'
        );
        insert.run(name, email, hashedPassword);

        return NextResponse.json(
            { message: 'User created successfully' },
            { status: 201 }
        );
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
