import { NextResponse } from 'next/server';
import Alert from '@/app/models/Alert';
import connectMongo from '@/app/lib/mongodb';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = 6;

        await connectMongo();
        const alerts = await Alert.find()
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Alert.countDocuments();

        return NextResponse.json({ alerts, totalPages: Math.ceil(total / limit) });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectMongo();
        const body = await req.json();
        const alert = await Alert.create(body);
        return NextResponse.json(alert);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
    }
}