'use client';

import { BeerForm } from '@/components/beer-form';
import { PageHeader } from '@/components/page-header';

export default function BeerCreatePage() {
	return (
		<div className="min-h-screen bg-background">
			<PageHeader
				title="맥주 등록"
				showBackButton
			/>

			<BeerForm mode="create" />
		</div>
	);
}
