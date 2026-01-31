'use server';

import { eq, desc, count } from 'drizzle-orm';
import { db, beers } from '@craft-brew/database';
import {
	CreateBeerInput,
	CreateBeerSchema,
	UpdateBeerInput,
	UpdateBeerSchema,
} from './schema';
import { revalidatePath } from 'next/cache';

const emptyToNull = (v: string | null | undefined) => (v === '' ? null : v);

export async function createBeer(input: CreateBeerInput) {
	try {
		const validated = CreateBeerSchema.safeParse(input);

		if (!validated.success) {
			return {
				success: false,
				error: validated.error.issues[0]?.message ?? 'Invalid input',
			};
		}

		const { data } = validated;

		const beer = await db
			.insert(beers)
			.values({
				name: data.name,
				type: data.type,

				volume: data.volume,

				malt: emptyToNull(data.malt),
				hop: emptyToNull(data.hop),
				water: emptyToNull(data.water),
				yeast: emptyToNull(data.yeast),
				additives: emptyToNull(data.additives),

				og: emptyToNull(data.og),
				fg: emptyToNull(data.fg),

				memo: emptyToNull(data.memo),

				fermentationStart: data.fermentationStart,
				fermentationEnd: data.fermentationEnd,

				fermentationTemp: emptyToNull(data.fermentationTemp),
				fermentationActualTemp: emptyToNull(data.fermentationActualTemp),
				fermentationActualHumidity: emptyToNull(
					data.fermentationActualHumidity,
				),

				agingStart: data.agingStart,
				agingEnd: data.agingEnd,

				agingTemp: emptyToNull(data.agingTemp),
				agingActualTemp: emptyToNull(data.agingActualTemp),
				agingActualHumidity: emptyToNull(data.agingActualHumidity),
			})
			.returning();

		revalidatePath('/beer');
		return { success: true, beer };
	} catch (error) {
		return {
			success: false,
			error: (error as Error).message,
		};
	}
}

export async function updateBeer(input: UpdateBeerInput) {
	const validated = UpdateBeerSchema.safeParse(input);

	if (!validated.success) {
		return {
			success: false,
			error: validated.error.issues[0]?.message ?? 'Invalid input',
		};
	}

	const { data } = validated;

	try {
		const beer = await db
			.update(beers)
			.set(data)
			.where(eq(beers.id, data.id))
			.returning();

		revalidatePath('/beer');
		return { success: true, beer };
	} catch (error) {
		return {
			success: false,
			error: (error as Error).message,
		};
	}
}

export async function getBeerList({
	page = 1,
	limit = 10,
}: {
	page?: number;
	limit?: number;
}) {
	try {
		const offset = (page - 1) * limit;

		const [beerList, totalCountResult] = await Promise.all([
			db
				.select()
				.from(beers)
				.orderBy(desc(beers.createdAt))
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(beers),
		]);

		const totalCount = totalCountResult[0]?.count ?? 0;
		const totalPages = Math.ceil(totalCount / limit);

		return {
			success: true,
			data: beerList,
			pagination: {
				page,
				limit,
				totalCount,
				totalPages,
			},
		};
	} catch (error) {
		return {
			success: false,
			error: (error as Error).message,
		};
	}
}

export async function deleteBeer(id: number) {
	try {
		await db.delete(beers).where(eq(beers.id, id));

		revalidatePath('/beer');
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: (error as Error).message,
		};
	}
}

export async function setBeerFermentationDuration({
	id,
	days,
}: {
	id: number;
	days: number;
}) {
	try {
		if (!Number.isFinite(days) || days <= 0) {
			return { success: false, error: 'invalid_days' };
		}

		const selected = await db
			.select()
			.from(beers)
			.where(eq(beers.id, id))
			.limit(1);

		const beer = selected[0];
		if (!beer) {
			return { success: false, error: 'not_found' };
		}

		const fermentationStart = beer.fermentationStart ?? new Date();
		const fermentationEnd = new Date(
			fermentationStart.getTime() + days * 24 * 60 * 60 * 1000,
		);

		await db
			.update(beers)
			.set({ fermentationStart, fermentationEnd })
			.where(eq(beers.id, id));

		revalidatePath('/beer');
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: (error as Error).message,
		};
	}
}
