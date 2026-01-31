'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getLastClientError } from '@/components/client-error-reporter';

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	const [details, setDetails] = useState<string | null>(null);

	useEffect(() => {
		setDetails(getLastClientError());
	}, []);

	return (
		<div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6 text-center">
			<h1 className="text-xl font-semibold">문제가 발생했습니다</h1>
			<p className="text-sm text-muted-foreground">
				페이지 로딩 중 오류가 발생했습니다. 다시 시도해 주세요.
			</p>
			{details && (
				<pre className="max-w-xl w-full text-left text-xs bg-muted/40 rounded-lg p-3 overflow-auto">
					{details}
				</pre>
			)}
			<div className="flex items-center gap-2">
				<Button onClick={() => reset()}>다시 시도</Button>
				<Button variant="outline" onClick={() => location.assign('/fridge')}>
					냉장고로 이동
				</Button>
			</div>
			{error?.digest && (
				<p className="text-xs text-muted-foreground">{error.digest}</p>
			)}
		</div>
	);
}
