import { BeerForm } from '@/components/beer-form';
import { PageHeader } from '@/components/page-header';
import { DeleteBeerButton } from '@/components/delete-beer-button';
import { beers, db } from '@craft-brew/database';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';

export default async function BeerUpdatePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	if (!id) {
		return notFound();
	}

	const beer = await db
		.select()
		.from(beers)
		.where(eq(beers.id, Number(id)))
		.limit(1);

	if (!beer) {
		return notFound();
	}

	return (
		<div className="min-h-screen bg-background">
			<PageHeader
				title="맥주 수정"
				showBackButton
				action={
					<DeleteBeerButton
						beerId={beer[0].id}
						beerName={beer[0].name}
					/>
				}
			/>

			<BeerForm
				mode="update"
				defaultValues={beer[0]}
			/>
		</div>
	);
}
