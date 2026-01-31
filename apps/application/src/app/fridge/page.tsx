'use client';

import { FridgeViewer } from '@/components/fridge-viewr';
import {
	clearFridgeBeer,
	finishFridgeBeer,
	getFridgeStatus,
	startFridgeBeerAging,
} from '@/api/fridge/action';
import { useEffect, useState } from 'react';
import { useFridgeStream } from '@/hooks/use-fridge-stream';
import type { FridgeStatus, Average24h, FridgeBeer } from '@craft-brew/redis';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Thermometer, List, Command } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { BEER_TYPES } from '@/constants/beer-types';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { getBeerById } from '@/api/beer/action';
import { PwaNotifications } from '@/components/pwa-notifications';

dayjs.extend(duration);

interface FridgeData {
	status: FridgeStatus;
	isOnline: boolean;
	avg24h: Average24h;
	beer: FridgeBeer | null;
}

export default function FridgePage() {
	const [data, setData] = useState<FridgeData | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [now, setNow] = useState(() => Date.now());
	const [actionState, setActionState] = useState<'aging' | 'finish' | null>(
		null,
	);
	const [agingDialogOpen, setAgingDialogOpen] = useState(false);
	const [agingDays, setAgingDays] = useState('');
	const [bottlingGravity, setBottlingGravity] = useState('1.010');
	const [originalGravity, setOriginalGravity] = useState<number | null>(null);

	// SSE로 실시간 상태 받기
	const { status: mqttStatus } = useFridgeStream();

	// 초기 데이터 로드 (Redis에서)
	const fetchInitialData = async () => {
		try {
			const result = await getFridgeStatus();

			if (result.success && result.data) {
				setData(result.data);
				setError(null);
			} else {
				setError(result.error || 'Failed to fetch fridge status');
			}
		} catch (err) {
			setError('Failed to fetch fridge status');
			console.error(err);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchInitialData();
	}, []);

	useEffect(() => {
		const interval = setInterval(() => {
			fetchInitialData();
		}, 60 * 1000);
		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		const loadOriginalGravity = async () => {
			if (!agingDialogOpen || !data?.beer) {
				return;
			}
			const result = await getBeerById(data.beer.id);
			if (result.success && result.data?.og) {
				const og = Number(result.data.og);
				setOriginalGravity(Number.isFinite(og) ? og : null);
			} else {
				setOriginalGravity(null);
			}
		};

		loadOriginalGravity();
	}, [agingDialogOpen, data?.beer]);

	useEffect(() => {
		const interval = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(interval);
	}, []);

	// SSE로 상태 업데이트 받으면 data 업데이트
	useEffect(() => {
		if (mqttStatus) {
			setData((prevData) => {
				// 초기 데이터가 없으면 SSE 데이터로 기본 상태 생성
				if (!prevData) {
					return {
						status: {
							temp: mqttStatus.temp,
							humidity: mqttStatus.humidity,
							power: mqttStatus.power,
							target: mqttStatus.target,
							updatedAt: mqttStatus.ts,
						},
						isOnline: mqttStatus.peltier_enabled,
						avg24h: { temp: 0, humidity: 0, count: 0 },
						beer: null,
					};
				}

				// 기존 데이터가 있으면 상태만 업데이트
				return {
					...prevData,
					status: {
						temp: mqttStatus.temp,
						humidity: mqttStatus.humidity,
						power: mqttStatus.power,
						target: mqttStatus.target,
						updatedAt: mqttStatus.ts,
					},
					isOnline: mqttStatus.peltier_enabled,
				};
			});

			// SSE로 데이터를 받았으면 로딩 상태 해제
			setIsLoading(false);
		}
	}, [mqttStatus]);

	const handleStartAging = async () => {
		const days = Number(agingDays);
		if (!Number.isFinite(days) || days <= 0) {
			toast.error('숙성 기간은 1일 이상 입력해주세요.');
			return;
		}

		setActionState('aging');
		try {
			const result = await startFridgeBeerAging({
				days,
				fg: bottlingGravity,
			});
			if (result.success) {
				toast.success('숙성을 시작했습니다.');
				setAgingDialogOpen(false);
				setAgingDays('');
				setBottlingGravity('');
				setOriginalGravity(null);
				await fetchInitialData();
			} else {
				toast.error(result.error || '숙성 시작에 실패했습니다.');
			}
		} catch (err) {
			toast.error('숙성 시작 중 오류가 발생했습니다.');
			console.error(err);
		} finally {
			setActionState(null);
		}
	};

	const expectedAbv = (() => {
		if (originalGravity === null) {
			return null;
		}
		const fg = Number(bottlingGravity);
		if (!Number.isFinite(fg)) {
			return null;
		}
		const abv = (originalGravity - fg) * 131.25;
		return abv > 0 ? abv : 0;
	})();

	const handleFinishBrewing = async () => {
		setActionState('finish');
		try {
			const result = await finishFridgeBeer();
			if (result.success) {
				toast.success('양조가 종료되었습니다.');
				await fetchInitialData();
			} else {
				toast.error(result.error || '양조 종료에 실패했습니다.');
			}
		} catch (err) {
			toast.error('양조 종료 중 오류가 발생했습니다.');
			console.error(err);
		} finally {
			setActionState(null);
		}
	};

	const formatDateRange = (start: string | null, end: string | null) => {
		if (!start || !end) {
			return null;
		}
		const startDate = dayjs(start);
		const endDate = dayjs(end);
		if (!startDate.isValid() || !endDate.isValid()) {
			return null;
		}
		return `${startDate.format('YYYY.MM.DD')} ~ ${endDate.format(
			'YYYY.MM.DD',
		)}`;
	};

	const formatCountdown = (ms: number | null) => {
		const safeMs = ms === null ? 0 : Math.max(0, ms);
		const totalSeconds = Math.floor(dayjs.duration(safeMs).asSeconds());
		const days = Math.floor(totalSeconds / 86400);
		const hours = Math.floor((totalSeconds % 86400) / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;
		return `${days}일 ${hours.toString().padStart(2, '0')}시간 ${minutes
			.toString()
			.padStart(2, '0')}분 ${seconds.toString().padStart(2, '0')}초`;
	};

	if (isLoading) {
		return (
			<div className="h-full flex items-center justify-center">
				<p className="text-muted-foreground">로딩 중...</p>
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="h-full flex flex-col items-center justify-center gap-2">
				<p className="text-destructive">
					{error || '데이터를 불러올 수 없습니다.'}
				</p>
			</div>
		);
	}

	const phase = data.beer?.status === 'aging' ? '숙성' : '발효';
	const phaseLabel = data.beer?.status === 'aging' ? '완료까지' : '숙성까지';
	const phaseStart =
		data.beer?.status === 'aging'
			? data.beer?.agingStart
			: data.beer?.fermentationStart;
	const phaseEnd =
		data.beer?.status === 'aging'
			? data.beer?.agingEnd
			: data.beer?.fermentationEnd;
	const phaseEndMs = phaseEnd ? dayjs(phaseEnd).valueOf() : null;
	const remainingMs =
		phaseEndMs !== null && Number.isFinite(phaseEndMs)
			? phaseEndMs - now
			: null;
	const isPhaseOver = remainingMs !== null && remainingMs <= 0;
	const phaseRange = formatDateRange(phaseStart ?? null, phaseEnd ?? null);
	const phaseCompleteText =
		data.beer?.status === 'aging'
			? '숙성이 완료되었어요'
			: '발효가 완료되었어요';
	const beerColor = data.beer
		? BEER_TYPES.find((type) => type.value === data.beer?.type)?.color ??
		  '#F59E0B'
		: null;

	return (
		<div className="h-full overflow-y-auto">
		<PageHeader
			title="냉장고"
			showBackButton
			action={
				<div className="flex items-center gap-2">
					<PwaNotifications />
					<Button
						asChild
						variant="ghost"
						size="icon-sm"
					>
							<Link
								href="/fridge/info"
								aria-label="현재 상태"
							>
								<Thermometer className="size-5" />
							</Link>
						</Button>
						<Button
							asChild
							variant="ghost"
							size="icon-sm"
						>
							<Link
								href="/fridge/commands"
								aria-label="커맨드 로그"
							>
								<Command className="size-5" />
							</Link>
						</Button>
						<Button
							asChild
							variant="ghost"
							size="icon-sm"
						>
							<Link
								href="/fridge/logs"
								aria-label="온도 로그"
							>
								<List className="size-5" />
							</Link>
						</Button>
					</div>
				}
			/>
			<div className="flex flex-col gap-4 h-full py-6">
				<FridgeViewer
					currentTemp={data.status.temp ?? 0}
					targetTemp={data.status.target ?? 0}
					power={data.status.power}
					humidity={data.status.humidity ?? 0}
					updatedAt={data.status.updatedAt}
					peltierEnabled={data.isOnline}
					info={
						<div className="">
							{data.beer ? (
								<div className="space-y-2">
									<p
										className="text-[52px] font-semibold tracking-tight text-shadow-lg"
										style={{ color: beerColor ?? '#F59E0B' }}
									>
										{data.beer.name}
										<span className="text-white text-[32px]">
											{' '}
											/ {data.beer.type}
										</span>
									</p>
									<p className="text-[32px] font-semibold text-shadow-lg text-white">
										{isPhaseOver
											? phaseCompleteText
											: `${phaseLabel} ${formatCountdown(remainingMs)}`}
									</p>
									{phaseRange && (
										<p className="text-sm text-white/80">{phaseRange}</p>
									)}
									{data.beer.status === 'fermentation' && (
										<Button
											size="lg"
											onClick={() => setAgingDialogOpen(true)}
										>
											숙성 시작하기
										</Button>
									)}
									{data.beer.status === 'aging' && isPhaseOver && (
										<Button
											variant="destructive"
											onClick={handleFinishBrewing}
											disabled={actionState === 'finish'}
											size="sm"
										>
											양조 종료하기
										</Button>
									)}
								</div>
							) : (
								<div className="text-sm text-muted-foreground">
									현재 냉장고에 설정된 맥주가 없습니다.
								</div>
							)}
						</div>
					}
				/>
				<Dialog
					open={agingDialogOpen}
					onOpenChange={setAgingDialogOpen}
				>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>숙성을 며칠동안 할 예정인가요?</DialogTitle>
							<DialogDescription>
								숙성 기간과 병입 비중을 입력하면 숙성이 시작됩니다.
							</DialogDescription>
						</DialogHeader>
						<div className="grid gap-3">
							<div className="grid gap-1">
								<label className="text-xs text-muted-foreground">
									숙성 기간
								</label>
								<div className="flex items-center gap-2">
									<Input
										type="number"
										min={1}
										placeholder="예: 7"
										value={agingDays}
										onChange={(event) => setAgingDays(event.target.value)}
										className="h-9"
									/>
									<span className="text-sm text-muted-foreground">일</span>
								</div>
							</div>
							<div className="grid gap-1">
								<label className="text-xs text-muted-foreground">
									병입 비중
								</label>
								<Input
									type="number"
									step="0.001"
									placeholder="예: 1.010"
									value={bottlingGravity}
									onChange={(event) => setBottlingGravity(event.target.value)}
									className="h-9"
								/>
							</div>
							<div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
								<p className="text-xs text-muted-foreground">예상 도수</p>
								<p className="text-base font-semibold">
									{expectedAbv === null
										? 'OG 또는 FG 입력 필요'
										: `${expectedAbv.toFixed(1)}%`}
								</p>
								{originalGravity === null && (
									<p className="text-xs text-muted-foreground">
										OG가 없어 계산할 수 없습니다.
									</p>
								)}
							</div>
						</div>
						<DialogFooter>
							<Button
								variant="ghost"
								onClick={() => setAgingDialogOpen(false)}
							>
								취소
							</Button>
							<Button
								onClick={handleStartAging}
								disabled={actionState === 'aging'}
							>
								숙성 시작
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	);
}
