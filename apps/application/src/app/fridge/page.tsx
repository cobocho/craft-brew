'use client';

import { FridgeViewer } from '@/components/fridge-viewr';
import { getFridgeStatus } from '@/api/fridge/action';
import { useEffect, useState } from 'react';
import { useFridgeStream } from '@/hooks/use-fridge-stream';
import type { FridgeStatus, Average24h, FridgeBeer } from '@craft-brew/redis';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Thermometer, List } from 'lucide-react';
import Link from 'next/link';

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

	// SSE로 실시간 상태 받기
	const { status: mqttStatus } = useFridgeStream();

	// 초기 데이터 로드 (Redis에서)
	useEffect(() => {
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

		fetchInitialData();
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

	return (
		<div className="h-full overflow-hidden">
			<PageHeader
				title="냉장고"
				showBackButton
				action={
					<div className="flex items-center gap-2">
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
								href="/fridge/logs"
								aria-label="온도 로그"
							>
								<List className="size-5" />
							</Link>
						</Button>
					</div>
				}
			/>
			<div className="h-full flex items-center justify-center overflow-hidden w-full">
				<FridgeViewer
					currentTemp={data.status.temp ?? 0}
					targetTemp={data.status.target ?? 0}
					power={data.status.power}
					humidity={data.status.humidity ?? 0}
					updatedAt={data.status.updatedAt}
					peltierEnabled={data.isOnline}
				/>
			</div>
		</div>
	);
}
