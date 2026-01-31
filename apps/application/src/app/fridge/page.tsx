'use client';

import { FridgeViewer } from '@/components/fridge-viewr';
import { getFridgeStatus } from '@/api/fridge/action';
import { useEffect, useState } from 'react';
import { useFridgeStream } from '@/hooks/use-fridge-stream';
import type { FridgeStatus, Average24h, FridgeBeer } from '@craft-brew/redis';

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
	const {
		status: mqttStatus,
		isConnected,
		error: mqttError,
	} = useFridgeStream();

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
							updatedAt: Math.floor(mqttStatus.ts / 1000),
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
						updatedAt: Math.floor(mqttStatus.ts / 1000),
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
				{mqttError && (
					<p className="text-xs text-muted-foreground">MQTT: {mqttError}</p>
				)}
			</div>
		);
	}

	return (
		<div className="h-full overflow-y-auto pb-4">
			<FridgeViewer
				currentTemp={data.status.temp ?? 0}
				targetTemp={data.status.target ?? 0}
				power={data.status.power}
				humidity={data.status.humidity ?? 0}
				updatedAt={new Date(data.status.updatedAt * 1000).toISOString()}
				peltierEnabled={data.isOnline}
			/>

			{/* 추가 정보 표시 */}
			<div className="mt-4 space-y-2 px-1">
				{/* 연결 상태 */}
				<div className="flex items-center justify-center gap-2 text-xs">
					<div
						className={`w-2 h-2 rounded-full ${
							isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
						}`}
					/>
					<span className="text-muted-foreground">
						MQTT {isConnected ? '연결됨' : '연결 끊김'}
					</span>
					{isConnected && (
						<>
							<span className="text-muted-foreground">•</span>
							<span className="text-muted-foreground">실시간 업데이트</span>
						</>
					)}
				</div>

				{data.beer && (
					<div className="p-4 border rounded-lg">
						<h3 className="font-semibold mb-2">현재 발효/숙성 중인 맥주</h3>
						<p className="text-sm">
							<span className="font-medium">{data.beer.name}</span> (
							{data.beer.type})
						</p>
						<p className="text-xs text-muted-foreground mt-1">
							{data.beer.startDate} ~ {data.beer.endDate}
						</p>
					</div>
				)}

				{data.avg24h.count > 0 && (
					<div className="p-4 border rounded-lg">
						<h3 className="font-semibold mb-2">24시간 평균</h3>
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<span className="text-muted-foreground">온도: </span>
								<span className="font-medium">{data.avg24h.temp}°C</span>
							</div>
							<div>
								<span className="text-muted-foreground">습도: </span>
								<span className="font-medium">{data.avg24h.humidity}%</span>
							</div>
						</div>
						<p className="text-xs text-muted-foreground mt-2">
							데이터 포인트: {data.avg24h.count}개
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
