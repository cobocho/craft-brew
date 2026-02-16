'use client';

import { useCallback, useEffect, useState } from 'react';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Button } from '@/components/ui/button';
import { getFridgeLogs } from '@/api/fridge/action';
import {
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/page-header';

interface FridgeLogRow {
	recordedAt: string;
	temperature: number;
	humidity: number | null;
	targetTemp: number | null;
	peltierPower: number;
	beerId: number | null;
}

function toDateTimeLocal(date: Date) {
	const pad = (value: number) => value.toString().padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
		date.getDate(),
	)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDisplay(dateValue: string) {
	const date = new Date(dateValue);
	return dayjs(date).format('MM-DD HH:mm:ss');
}

export default function FridgeLogsPage() {
	const [start, setStart] = useState('');
	const [end, setEnd] = useState('');
	const [logs, setLogs] = useState<FridgeLogRow[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const setDefaultRange = useCallback(() => {
		const now = new Date();
		const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
		setStart(toDateTimeLocal(startDate));
		setEnd(toDateTimeLocal(now));
	}, []);

	const fetchLogs = useCallback(
		async (rangeStart: string, rangeEnd: string) => {
			setIsLoading(true);
			setError(null);
			try {
				const startDate = new Date(rangeStart);
				const endDate = new Date(rangeEnd);
				if (
					Number.isNaN(startDate.getTime()) ||
					Number.isNaN(endDate.getTime())
				) {
					setError('유효한 날짜를 선택해주세요.');
					return;
				}

				const result = await getFridgeLogs({
					start: startDate.toISOString(),
					end: endDate.toISOString(),
				});
				if (result.success && result.data) {
					setLogs(result.data);
					return;
				}
				setError(result.error || '로그를 불러오지 못했습니다.');
			} catch (err) {
				setError((err as Error).message);
			} finally {
				setIsLoading(false);
			}
		},
		[],
	);

	useEffect(() => {
		setDefaultRange();
	}, [setDefaultRange]);

	useEffect(() => {
		if (!start || !end) return;
		void fetchLogs(start, end);
	}, [start, end, fetchLogs]);

	const avgTemp =
		logs.length > 0
			? logs.reduce((sum, log) => sum + log.temperature, 0) / logs.length
			: null;
	const avgHumidity =
		logs.length > 0
			? logs.reduce((sum, log) => sum + (log.humidity ?? 0), 0) / logs.length
			: null;
	const humidityCount = logs.filter((log) => log.humidity !== null).length;
	const avgTarget =
		logs.length > 0
			? logs.reduce((sum, log) => sum + (log.targetTemp ?? 0), 0) / logs.length
			: null;
	const targetCount = logs.filter((log) => log.targetTemp !== null).length;
	const avgPeltier =
		logs.length > 0
			? logs.reduce((sum, log) => sum + log.peltierPower, 0) / logs.length
			: null;

	const chartData = [...logs]
		.sort(
			(a, b) =>
				new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
		)
		.map((log) => ({
			time: log.recordedAt,
			temperature: log.temperature,
			humidity: log.humidity,
		}));

	const humidityChartData = chartData.filter((d) => d.humidity !== null);

	return (
		<div className="h-full overflow-y-auto pb-6">
			<PageHeader
				title="온도 로그"
				showBackButton
			/>
			<div className="flex flex-col gap-2">
				<p className="text-xs text-muted-foreground">
					기간을 지정해 온도/습도 기록을 확인합니다. 기본 범위는 최근
					24시간입니다.
				</p>
			</div>

			<div className="mt-4 flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/30 p-4 sm:flex-row sm:items-end sm:justify-between">
				<div className="flex flex-wrap gap-3">
					<div className="flex flex-col gap-1">
						<label
							className="text-xs text-muted-foreground"
							htmlFor="log-start"
						>
							시작
						</label>
						<DateTimePicker
							id="log-start"
							value={start}
							onChange={(value) => setStart(value)}
							onReset={() => setDefaultRange()}
						/>
					</div>
					<div className="flex flex-col gap-1">
						<label
							className="text-xs text-muted-foreground"
							htmlFor="log-end"
						>
							종료
						</label>
						<DateTimePicker
							id="log-end"
							value={end}
							onChange={(value) => setEnd(value)}
							onReset={() => setDefaultRange()}
						/>
					</div>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => fetchLogs(start, end)}
					disabled={isLoading || !start || !end}
				>
					{isLoading ? '불러오는 중...' : '조회'}
				</Button>
			</div>

			{error && <p className="mt-3 text-sm text-destructive">{error}</p>}

			<div className="mt-4 space-y-2">
				<div className="grid gap-3 rounded-lg border border-border/70 bg-muted/30 px-3 py-3 text-sm sm:grid-cols-4">
					<div>
						<p className="text-xs text-muted-foreground">평균 온도</p>
						<p className="text-base font-semibold">
							{avgTemp === null ? '-' : `${avgTemp.toFixed(1)}°C`}
						</p>
					</div>
					<div>
						<p className="text-xs text-muted-foreground">평균 습도</p>
						<p className="text-base font-semibold">
							{humidityCount === 0 ? '-' : `${(avgHumidity ?? 0).toFixed(1)}%`}
						</p>
						<p className="text-xs text-muted-foreground">
							{humidityCount === 0
								? '습도 데이터 없음'
								: `기록 ${humidityCount}개`}
						</p>
					</div>
					<div>
						<p className="text-xs text-muted-foreground">평균 목표 온도</p>
						<p className="text-base font-semibold">
							{targetCount === 0 ? '-' : `${(avgTarget ?? 0).toFixed(1)}°C`}
						</p>
						<p className="text-xs text-muted-foreground">
							{targetCount === 0 ? '목표 온도 없음' : `기록 ${targetCount}개`}
						</p>
					</div>
					<div>
						<p className="text-xs text-muted-foreground">평균 펠티어 출력</p>
						<p className="text-base font-semibold">
							{avgPeltier === null ? '-' : `${avgPeltier.toFixed(0)}%`}
						</p>
					</div>
				</div>
				<div className="rounded-lg border border-border/70 bg-background p-3">
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-semibold">온도 추이</h3>
						<p className="text-xs text-muted-foreground">
							{chartData.length}개 포인트
						</p>
					</div>
					<div className="mt-3 h-56 min-h-[14rem] w-full">
						{chartData.length === 0 ? (
							<div className="h-full rounded-md border border-dashed border-border/70 flex items-center justify-center text-sm text-muted-foreground">
								표시할 데이터가 없습니다.
							</div>
						) : (
							<ResponsiveContainer width="100%" height="100%" minHeight={200}>
								<LineChart
									data={chartData}
									margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
								>
									<XAxis
										dataKey="time"
										minTickGap={32}
										tick={{ fontSize: 11 }}
										tickFormatter={(value: string) =>
											new Date(value).toLocaleTimeString('ko-KR', {
												hour: '2-digit',
												minute: '2-digit',
											})
										}
									/>
									<YAxis
										width={36}
										tick={{ fontSize: 11 }}
										tickFormatter={(value: number) => `${value}°`}
									/>
									<Tooltip
										labelFormatter={(label) => {
											if (typeof label !== 'string') return '';
											return new Date(label).toLocaleString('ko-KR');
										}}
										formatter={(value) => {
											if (typeof value !== 'number') return ['-', '온도'];
											return [`${value}°C`, '온도'];
										}}
									/>
									<Line
										type="monotone"
										dataKey="temperature"
										stroke="#10b981"
										strokeWidth={2}
										dot={false}
									/>
								</LineChart>
							</ResponsiveContainer>
						)}
					</div>
				</div>
				<div className="rounded-lg border border-border/70 bg-background p-3">
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-semibold">습도 추이</h3>
						<p className="text-xs text-muted-foreground">
							{humidityCount}개 포인트
						</p>
					</div>
					<div className="mt-3 h-56 min-h-[14rem] w-full">
						{humidityChartData.length === 0 ? (
							<div className="h-full rounded-md border border-dashed border-border/70 flex items-center justify-center text-sm text-muted-foreground">
								표시할 데이터가 없습니다.
							</div>
						) : (
							<ResponsiveContainer width="100%" height="100%" minHeight={200}>
								<LineChart
									data={humidityChartData}
									margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
								>
									<XAxis
										dataKey="time"
										minTickGap={32}
										tick={{ fontSize: 11 }}
										tickFormatter={(value: string) =>
											new Date(value).toLocaleTimeString('ko-KR', {
												hour: '2-digit',
												minute: '2-digit',
											})
										}
									/>
									<YAxis
										width={36}
										tick={{ fontSize: 11 }}
										tickFormatter={(value: number) => `${value}%`}
									/>
									<Tooltip
										labelFormatter={(label) => {
											if (typeof label !== 'string') return '';
											return new Date(label).toLocaleString('ko-KR');
										}}
										formatter={(value) => {
											if (typeof value !== 'number') return ['-', '습도'];
											return [`${value}%`, '습도'];
										}}
									/>
									<Line
										type="monotone"
										dataKey="humidity"
										stroke="#38bdf8"
										strokeWidth={2}
										dot={false}
									/>
								</LineChart>
							</ResponsiveContainer>
						)}
					</div>
				</div>
				<div className="grid grid-cols-5 gap-3 rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
					<span>시간</span>
					<span>온도</span>
					<span>습도</span>
					<span>목표</span>
					<span>펠티어</span>
				</div>
				{logs.length === 0 && !isLoading ? (
					<div className="rounded-lg border border-dashed border-border/70 py-10 text-center text-sm text-muted-foreground">
						선택한 기간에 기록이 없습니다.
					</div>
				) : (
					logs.map((log) => (
						<div
							key={log.recordedAt}
							className="grid grid-cols-5 gap-3 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
						>
							<span className="text-xs text-muted-foreground">
								{formatDisplay(log.recordedAt)}
							</span>
							<span>{log.temperature.toFixed(1)}°C</span>
							<span>
								{log.humidity === null ? '-' : `${log.humidity.toFixed(1)}%`}
							</span>
							<span>
								{log.targetTemp === null
									? '-'
									: `${log.targetTemp.toFixed(1)}°C`}
							</span>
							<span>{log.peltierPower}%</span>
						</div>
					))
				)}
			</div>
		</div>
	);
}
