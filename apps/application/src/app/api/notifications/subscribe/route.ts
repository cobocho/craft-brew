import { NextResponse } from 'next/server';
import { HomebrewRedis, PushSubscriptionData } from '@craft-brew/redis';

const redis = new HomebrewRedis();

export async function POST(req: Request) {
	try {
		const body = (await req.json()) as {
			subscription?: PushSubscriptionData;
		};

		if (!body.subscription?.endpoint) {
			return NextResponse.json(
				{ success: false, error: 'invalid_subscription' },
				{ status: 400 },
			);
		}

		await redis.addPushSubscription(body.subscription);
		return NextResponse.json({ success: true });
	} catch (error) {
		return NextResponse.json(
			{ success: false, error: (error as Error).message },
			{ status: 500 },
		);
	}
}
