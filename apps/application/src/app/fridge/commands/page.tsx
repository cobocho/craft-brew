'use client';

import { useCallback, useEffect, useState } from 'react';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { getCommandLogs } from '@/api/fridge/action';
import { PageHeader } from '@/components/page-header';

type CommandStatusFilter = 'all' | 'success' | 'failed';

interface CommandLogRow {
	id: string;
	cmd: string;
	value: string | null;
	completed: boolean;
	error: string | null;
	ts: string;
	completedAt: string | null;
}

interface CommandSummary {
	total: number;
	success: number;
	failed: number;
	pending: number;
}

function toDateTimeLocal(date: Date) {
	const pad = (value: number) => value.toString().padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
		date.getDate(),
	)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDisplay(dateValue: string) {
	const date = new Date(dateValue);
	return date.toLocaleString('ko-KR', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
}

export default function CommandLogsPage() {
	const [start, setStart] = useState('');
	const [end, setEnd] = useState('');
	const [status, setStatus] = useState<CommandStatusFilter>('all');
	const [logs, setLogs] = useState<CommandLogRow[]>([]);
	const [summary, setSummary] = useState<CommandSummary>({
		total: 0,
		success: 0,
		failed: 0,
		pending: 0,
	});
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const setDefaultRange = useCallback(() => {
		const now = new Date();
		const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
		setStart(toDateTimeLocal(startDate));
		setEnd(toDateTimeLocal(now));
	}, []);

	const fetchLogs = useCallback(
		async (rangeStart: string, rangeEnd: string, filter: CommandStatusFilter) => {
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

				const result = await getCommandLogs({
					start: startDate.toISOString(),
					end: endDate.toISOString(),
					status: filter,
				});

				if (result.success && result.data && result.summary) {
					setLogs(result.data);
					setSummary(result.summary);
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
		void fetchLogs(start, end, status);
	}, [start, end, status, fetchLogs]);

	const totalAttempts = summary.success + summary.failed;
	const successRate =
		totalAttempts === 0
			? null
			: Math.round((summary.success / totalAttempts) * 1000) / 10;

	return (
		<div className="h-full overflow-y-auto pb-6">
			<PageHeader title="커맨드 로그" showBackButton />
			<div className="flex flex-col gap-2">
				<p className="text-xs text-muted-foreground">
					기간을 지정해 명령 성공/실패 기록을 확인합니다.
				</p>
			</div>

			<div className="mt-4 flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/30 p-4 lg:flex-row lg:items-end lg:justify-between">
				<div className="flex flex-wrap gap-3">
					<div className="flex flex-col gap-1">
						<label className="text-xs text-muted-foreground" htmlFor="command-start">
							시작
						</label>
						<DateTimePicker
							id="command-start"
							value={start}
							onChange={(value) => setStart(value)}
							onReset={() => setDefaultRange()}
						/>
					</div>
					<div className="flex flex-col gap-1">
						<label className="text-xs text-muted-foreground" htmlFor="command-end">
							종료
						</label>
						<DateTimePicker
							id="command-end"
							value={end}
							onChange={(value) => setEnd(value)}
							onReset={() => setDefaultRange()}
						/>
					</div>
					<div className="flex flex-col gap-1">
						<label className="text-xs text-muted-foreground">상태</label>
						<Select value={status} onValueChange={(value) => setStatus(value as CommandStatusFilter)}>
							<SelectTrigger size="sm" className="w-32">
								<SelectValue placeholder="전체" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">전체</SelectItem>
								<SelectItem value="success">성공</SelectItem>
								<SelectItem value="failed">실패</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => fetchLogs(start, end, status)}
					disabled={isLoading || !start || !end}
				>
					{isLoading ? '불러오는 중...' : '조회'}
				</Button>
			</div>

			{error && <p className="mt-3 text-sm text-destructive">{error}</p>}

			<div className="mt-4 grid gap-3 rounded-lg border border-border/70 bg-muted/30 px-3 py-3 text-sm sm:grid-cols-4">
				<div>
					<p className="text-xs text-muted-foreground">성공률</p>
					<p className="text-base font-semibold">
						{successRate === null ? '-' : `${successRate}%`}
					</p>
				</div>
				<div>
					<p className="text-xs text-muted-foreground">성공</p>
					<p className="text-base font-semibold text-emerald-500">
						{summary.success}건
					</p>
				</div>
				<div>
					<p className="text-xs text-muted-foreground">실패</p>
					<p className="text-base font-semibold text-rose-500">
						{summary.failed}건
					</p>
				</div>
				<div>
					<p className="text-xs text-muted-foreground">대기</p>
					<p className="text-base font-semibold">{summary.pending}건</p>
				</div>
			</div>

			<div className="mt-4 space-y-2">
				<div className="grid grid-cols-5 gap-3 rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
					<span>시간</span>
					<span>명령</span>
					<span>값</span>
					<span>상태</span>
					<span>오류</span>
				</div>
				{logs.length === 0 && !isLoading ? (
					<div className="rounded-lg border border-dashed border-border/70 py-10 text-center text-sm text-muted-foreground">
						선택한 기간에 기록이 없습니다.
					</div>
				) : (
					logs.map((log) => {
						const statusLabel = log.completed
							? '성공'
							: log.error
								? '실패'
								: '대기';
						const statusClass = log.completed
							? 'text-emerald-500'
							: log.error
								? 'text-rose-500'
								: 'text-muted-foreground';
						return (
							<div
								key={log.id}
								className="grid grid-cols-5 gap-3 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
							>
								<span className="text-xs text-muted-foreground">
									{formatDisplay(log.ts)}
								</span>
								<span>{log.cmd}</span>
								<span>{log.value ?? '-'}</span>
								<span className={statusClass}>{statusLabel}</span>
								<span className="truncate text-xs text-muted-foreground">
									{log.error ?? '-'}
								</span>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}
