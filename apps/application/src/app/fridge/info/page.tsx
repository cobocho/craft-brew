'use client';

import { useEffect, useState } from 'react';
import { FridgeSettingsDialog } from '@/components/fridge-settings-dialog';
import { getFridgeStatus } from '@/api/fridge/action';
import { useFridgeStream } from '@/hooks/use-fridge-stream';
import type { FridgeStatus, Average24h, FridgeBeer } from '@craft-brew/redis';
import { PageHeader } from '@/components/page-header';

interface FridgeData {
	status: FridgeStatus;
	isOnline: boolean;
	avg24h: Average24h;
	beer: FridgeBeer | null;
}

export default function FridgeInfoPage() {
	const [data, setData] = useState<FridgeData | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const {
		status: mqttStatus,
		isConnected,
		error: mqttError,
	} = useFridgeStream();

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

	useEffect(() => {
		if (mqttStatus) {
			setData((prevData) => {
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
				{mqttError && (
					<p className="text-xs text-muted-foreground">MQTT: {mqttError}</p>
				)}
			</div>
		);
	}

	return (
		<div className="h-full overflow-y-auto pb-4">
			<PageHeader title="냉장고 정보" showBackButton />
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p className="text-xs text-muted-foreground">
						장치 상태와 평균 데이터, 설정을 확인합니다.
					</p>
				</div>
				<FridgeSettingsDialog
					targetTemp={data.status.target ?? null}
					peltierEnabled={data.isOnline}
				/>
			</div>

			<div className="mt-4 grid gap-4 md:grid-cols-2">
				<div className="rounded-xl border border-border/70 bg-muted/30 p-4">
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-semibold">MQTT 연결</h3>
						<div className="flex items-center gap-2 text-xs text-muted-foreground">
							<span
								className={`h-2 w-2 rounded-full ${
									isConnected ? 'bg-emerald-500' : 'bg-rose-500'
								}`}
							/>
							{isConnected ? '연결됨' : '연결 끊김'}
						</div>
					</div>
					<p className="mt-2 text-xs text-muted-foreground">
						{isConnected
							? '실시간 상태 업데이트 수신 중입니다.'
							: '현재 실시간 업데이트가 중단되었습니다.'}
					</p>
					{mqttError && (
						<p className="mt-2 text-xs text-destructive">{mqttError}</p>
					)}
				</div>

				<div className="rounded-xl border border-border/70 bg-muted/30 p-4">
					<h3 className="text-sm font-semibold">24시간 평균</h3>
					{data.avg24h.count > 0 ? (
						<div className="mt-3 grid grid-cols-2 gap-4 text-sm">
							<div>
								<p className="text-xs text-muted-foreground">온도</p>
								<p className="text-base font-semibold">{data.avg24h.temp}°C</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">습도</p>
								<p className="text-base font-semibold">
									{data.avg24h.humidity}%
								</p>
							</div>
							<p className="col-span-2 text-xs text-muted-foreground">
								데이터 포인트: {data.avg24h.count}개
							</p>
						</div>
					) : (
						<p className="mt-2 text-xs text-muted-foreground">
							24시간 평균 데이터가 아직 충분하지 않습니다.
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
