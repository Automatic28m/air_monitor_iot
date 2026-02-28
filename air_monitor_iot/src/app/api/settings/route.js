import { NextResponse } from 'next/server';
import connectMongo from '../../../lib/mongodb';
import Settings from '../../../models/Settings';

export async function GET() {
    try {
        await connectMongo();
        let settings = await Settings.findOne({});
        
        // If no settings exist yet, create default ones
        if (!settings) {
            settings = await Settings.create({}); 
        }
        return NextResponse.json(settings);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectMongo();
        const body = await req.json();
        
        // Upsert updates the single document, or creates it if it doesn't exist
        const updatedSettings = await Settings.findOneAndUpdate({}, body, { new: true, upsert: true });
        return NextResponse.json(updatedSettings);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}