import { NextResponse } from 'next/server';
import connectMongo from '@/app/lib/mongodb';
import Alert from '@/app/models/Alert';

export async function GET() {
    try {
        await connectMongo();

        // Establish timezone and time boundaries (Adjusted for Thailand timezone)
        const now = new Date();
        const startOfToday = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
        startOfToday.setHours(0, 0, 0, 0);

        const sevenDaysAgo = new Date(startOfToday);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // 7 days including today

        // 1. Fetch Today's Alert Count
        const todayCount = await Alert.countDocuments({
            timestamp: { $gte: startOfToday }
        });

        // 2. Fetch 7-Day History using Aggregation
        const history = await Alert.aggregate([
            {
                $match: { timestamp: { $gte: sevenDaysAgo } }
            },
            {
                $group: {
                    // Group by day, converted to Asia/Bangkok time
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp", timezone: "Asia/Bangkok" } },
                    count: { $sum: 1 }
                }
            }
        ]);

        // 3. Format data for Recharts (Fills in days with 0 alerts)
        const formattedHistory = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(sevenDaysAgo);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

            const found = history.find(h => h._id === dateStr);
            formattedHistory.push({
                day: dayName,
                fullDate: dateStr,
                alerts: found ? found.count : 0
            });
        }

        return NextResponse.json({ todayCount, history: formattedHistory });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }
}