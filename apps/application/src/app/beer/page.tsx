import { getBeerList } from '@/api/beer/action';
import { BeerListClient } from '@/components/beer-list-client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface BeerListPageProps {
	searchParams: Promise<{ page?: string }>;
}

export default async function BeerListPage({
	searchParams,
}: BeerListPageProps) {
	const params = await searchParams;
	const page = Number(params.page) || 1;

	const result = await getBeerList({ page, limit: 10 });

	if (!result.success) {
		return (
			<div className="min-h-screen bg-background">
				<PageHeader title="맥주 목록" />
				<div className="text-center text-muted-foreground py-12">
					맥주 목록을 불러오는 중 오류가 발생했습니다.
				</div>
			</div>
		);
	}

	return (
		<div>
			<PageHeader
				title="맥주 목록"
				action={
					<Button
						asChild
						size="sm"
					>
						<Link href="/beer/create">맥주 등록</Link>
					</Button>
				}
			/>

			<BeerListClient
				beers={result.data || []}
				pagination={
					result.pagination || {
						page: 1,
						limit: 10,
						totalCount: 0,
						totalPages: 1,
					}
				}
			/>
		</div>
	);
}
