'use client';

import { Beer } from '@craft-brew/database';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { deleteBeer, setBeerFermentationDuration } from '@/api/beer/action';
import {
	clearFridgeBeer,
	getFridgeStatus,
	setFridgeBeer,
} from '@/api/fridge/action';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { BEER_TYPES } from '@/constants/beer-types';
import { Calendar, Droplet, Trash2 } from 'lucide-react';

interface BeerListClientProps {
	beers: Beer[];
	pagination: {
		page: number;
		limit: number;
		totalCount: number;
		totalPages: number;
	};
}

export function BeerListClient({ beers, pagination }: BeerListClientProps) {
	const router = useRouter();
	const [isDeleting, setIsDeleting] = useState(false);
	const [currentBeerId, setCurrentBeerId] = useState<number | null>(null);
	const [isSettingBeerId, setIsSettingBeerId] = useState<number | null>(null);
	const [fermentationDialogOpen, setFermentationDialogOpen] = useState(false);
	const [pendingBeer, setPendingBeer] = useState<Beer | null>(null);
	const [fermentationDays, setFermentationDays] = useState('');

	useEffect(() => {
		const fetchCurrentBeer = async () => {
			const result = await getFridgeStatus();
			if (result.success && result.data?.beer) {
				setCurrentBeerId(result.data.beer.id);
			} else {
				setCurrentBeerId(null);
			}
		};

		fetchCurrentBeer();
	}, []);

	const handleDelete = async (beerId: number, beerName: string) => {
		setIsDeleting(true);
		try {
			const result = await deleteBeer(beerId);

			if (result.success) {
				toast.success(`"${beerName}" 맥주가 삭제되었습니다.`);
				router.refresh();
			} else {
				toast.error(result.error || '맥주 삭제에 실패했습니다.');
			}
		} catch (error) {
			toast.error('맥주 삭제 중 오류가 발생했습니다.');
			console.error(error);
		} finally {
			setIsDeleting(false);
		}
	};

	const handleSetFridgeBeer = async (beerId: number, beerName: string) => {
		setIsSettingBeerId(beerId);
		try {
			if (currentBeerId === beerId) {
				const result = await clearFridgeBeer();
				if (result.success) {
					setCurrentBeerId(null);
					toast.success('냉장고 설정을 해제했습니다.');
					router.refresh();
				} else {
					toast.error(result.error || '냉장고 설정 해제에 실패했습니다.');
				}
			} else {
				const result = await setFridgeBeer(beerId);
				if (result.success) {
					setCurrentBeerId(beerId);
					toast.success(`"${beerName}" 맥주를 냉장고에 설정했습니다.`);
					router.refresh();
				} else {
					toast.error(result.error || '냉장고 설정에 실패했습니다.');
				}
			}
		} catch (error) {
			toast.error('냉장고 설정 처리 중 오류가 발생했습니다.');
			console.error(error);
		} finally {
			setIsSettingBeerId(null);
		}
	};

	const handleOpenFermentationDialog = (beer: Beer) => {
		setPendingBeer(beer);
		setFermentationDays('');
		setFermentationDialogOpen(true);
	};

	const handleSkipFermentation = async () => {
		if (!pendingBeer) {
			return;
		}
		setFermentationDialogOpen(false);
		await handleSetFridgeBeer(pendingBeer.id, pendingBeer.name);
		setPendingBeer(null);
	};

	const handleSaveFermentation = async () => {
		if (!pendingBeer) {
			return;
		}
		const days = Number(fermentationDays);
		if (!Number.isFinite(days) || days <= 0) {
			toast.error('발효 기간은 1일 이상 입력해주세요.');
			return;
		}

		setIsSettingBeerId(pendingBeer.id);
		try {
			const result = await setBeerFermentationDuration({
				id: pendingBeer.id,
				days,
			});
			if (!result.success) {
				toast.error(result.error || '발효 일정 저장에 실패했습니다.');
				return;
			}

			setFermentationDialogOpen(false);
			await handleSetFridgeBeer(pendingBeer.id, pendingBeer.name);
			setPendingBeer(null);
		} catch (error) {
			toast.error('발효 일정 저장 중 오류가 발생했습니다.');
			console.error(error);
		} finally {
			setIsSettingBeerId(null);
		}
	};

	if (beers.length === 0) {
		return (
			<div className="text-center py-12">
				<p className="text-muted-foreground mb-4">등록된 맥주가 없습니다.</p>
				<Button asChild>
					<Link href="/beer/create">맥주 등록하기</Link>
				</Button>
			</div>
		);
	}

	const getBeerTypeColor = (type: string) => {
		const beerType = BEER_TYPES.find((bt) => bt.value === type);
		return beerType?.color || '#9CA3AF';
	};

	const getBrewingStatus = (beer: Beer) => {
		if (beer.fermentationStart && !beer.fermentationEnd) {
			return {
				label: '발효 중',
				color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
			};
		}

		if (beer.agingStart && !beer.agingEnd) {
			return {
				label: '숙성 중',
				color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
			};
		}

		if (beer.fermentationEnd || beer.agingEnd) {
			return {
				label: '완성',
				color: 'bg-green-500/10 text-green-700 dark:text-green-400',
			};
		}

		return null;
	};

	return (
		<div className="space-y-6">
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{beers.map((beer) => {
					const status = getBrewingStatus(beer);
					const isCurrentBeer = currentBeerId === beer.id;

					return (
						<div
							key={beer.id}
							className="group relative border rounded-xl p-5 hover:shadow-lg hover:border-primary/20 transition-all bg-card"
						>
							<Link
								href={`/beer/update/${beer.id}`}
								className="block space-y-3"
							>
								{/* Header */}
								<div className="flex items-start justify-between gap-3">
									<div className="flex-1 space-y-2 pr-8">
										<div className="flex items-center gap-2">
											<div
												className="w-3 h-3 rounded-full shrink-0"
												style={{ backgroundColor: getBeerTypeColor(beer.type) }}
											/>
											<h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">
												{beer.name}
											</h3>
										</div>

										<div className="flex items-center gap-2 flex-wrap">
											<span className="text-xs px-2 py-1 rounded-md bg-muted font-medium">
												{beer.type}
											</span>
											{status && (
												<span
													className={`text-xs px-2 py-1 rounded-md font-medium ${status.color}`}
												>
													{status.label}
												</span>
											)}
										</div>
									</div>
								</div>

								{/* Content */}
								<div className="space-y-2">
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<Droplet className="w-4 h-4" />
										<span>{beer.volume}L</span>
										{(beer.og || beer.fg) && (
											<>
												<span className="text-muted-foreground/40">•</span>
												<span className="text-xs">
													{beer.og && `OG: ${beer.og}`}
													{beer.og && beer.fg && ' / '}
													{beer.fg && `FG: ${beer.fg}`}
												</span>
											</>
										)}
									</div>

									{beer.createdAt && (
										<div className="flex items-center gap-2 text-xs text-muted-foreground">
											<Calendar className="w-3.5 h-3.5" />
											<span>
												{new Date(beer.createdAt).toLocaleDateString('ko-KR', {
													year: 'numeric',
													month: 'long',
													day: 'numeric',
												})}
											</span>
										</div>
									)}

									{beer.memo && (
										<p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed pt-1">
											{beer.memo}
										</p>
									)}
								</div>
							</Link>

							<div className="mt-4 flex items-center justify-between gap-2">
								<div className="text-xs text-muted-foreground">
									{isCurrentBeer ? '현재 냉장고 설정됨' : '냉장고에 설정 가능'}
								</div>
								<Button
									size="sm"
									variant={isCurrentBeer ? 'outline' : 'default'}
									disabled={isSettingBeerId === beer.id}
									onClick={() => {
										if (!isCurrentBeer && !beer.fermentationEnd) {
											handleOpenFermentationDialog(beer);
											return;
										}
										handleSetFridgeBeer(beer.id, beer.name);
									}}
								>
									{isCurrentBeer ? '설정됨' : '냉장고에 설정'}
								</Button>
							</div>

							{/* Delete Button */}
							<div className="absolute top-4 right-4">
								<AlertDialog>
									<AlertDialogTrigger asChild>
										<Button
											variant="ghost"
											size="icon-sm"
											disabled={isDeleting}
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
											}}
											className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
										>
											<Trash2 className="w-4 h-4" />
										</Button>
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>
												맥주를 삭제하시겠습니까?
											</AlertDialogTitle>
											<AlertDialogDescription>
												<span className="font-semibold">{beer.name}</span> 맥주를
												삭제하면 복구할 수 없습니다. 정말 삭제하시겠습니까?
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>취소</AlertDialogCancel>
											<AlertDialogAction
												onClick={() => handleDelete(beer.id, beer.name)}
												variant="destructive"
											>
												삭제
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							</div>
						</div>
					);
				})}
			</div>

			{pagination.totalPages > 1 && (
				<div className="flex items-center justify-center gap-2 pt-4">
					<Button
						variant="outline"
						size="sm"
						disabled={pagination.page === 1}
						onClick={() => router.push(`/beer?page=${pagination.page - 1}`)}
					>
						이전
					</Button>

					<div className="flex items-center gap-1">
						{Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
							(pageNum) => {
								const isCurrentPage = pageNum === pagination.page;
								const showPage =
									pageNum === 1 ||
									pageNum === pagination.totalPages ||
									Math.abs(pageNum - pagination.page) <= 2;

								if (!showPage) {
									if (
										pageNum === pagination.page - 3 ||
										pageNum === pagination.page + 3
									) {
										return (
											<span
												key={pageNum}
												className="px-2"
											>
												...
											</span>
										);
									}
									return null;
								}

								return (
									<Button
										key={pageNum}
										variant={isCurrentPage ? 'default' : 'outline'}
										size="sm"
										onClick={() => router.push(`/beer?page=${pageNum}`)}
										disabled={isCurrentPage}
									>
										{pageNum}
									</Button>
								);
							},
						)}
					</div>

					<Button
						variant="outline"
						size="sm"
						disabled={pagination.page === pagination.totalPages}
						onClick={() => router.push(`/beer?page=${pagination.page + 1}`)}
					>
						다음
					</Button>
				</div>
			)}

			<div className="text-center text-sm text-muted-foreground">
				총 {pagination.totalCount}개의 맥주 ({pagination.page} /{' '}
				{pagination.totalPages} 페이지)
			</div>

			<Dialog
				open={fermentationDialogOpen}
				onOpenChange={setFermentationDialogOpen}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>발효를 얼마나 하실 예정인가요?</DialogTitle>
						<DialogDescription>
							발효 기간을 입력하면 종료일이 자동으로 저장됩니다.
							스킵하면 나중에 다시 설정할 수 있어요.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-2">
						<label className="text-xs text-muted-foreground">발효 기간</label>
						<div className="flex items-center gap-2">
							<Input
								type="number"
								min={1}
								placeholder="예: 7"
								value={fermentationDays}
								onChange={(event) => setFermentationDays(event.target.value)}
								className="h-9"
							/>
							<span className="text-sm text-muted-foreground">일</span>
						</div>
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={handleSkipFermentation}>
							스킵
						</Button>
						<Button onClick={handleSaveFermentation}>저장하고 설정</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
