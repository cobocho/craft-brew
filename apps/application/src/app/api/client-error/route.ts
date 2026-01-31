import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	try {
		const payload = await req.json();
		console.error('[CLIENT_ERROR]', JSON.stringify(payload));
		return NextResponse.json({ success: true });
	} catch (error) {
		return NextResponse.json(
			{ success: false, error: (error as Error).message },
			{ status: 500 },
		);
	}
}
