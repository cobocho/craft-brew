import Link from 'next/link';
import { Thermometer, BarChart3, Settings2, Beer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';

const quickLinks = [
	{
		title: '현재 상태',
		description: '실시간 온도와 목표값 확인',
		href: '/fridge',
		icon: Thermometer,
	},
	{
		title: '냉장고 정보',
		description: '설정 변경과 연결 상태',
		href: '/fridge/info',
		icon: Settings2,
	},
	{
		title: '온도 로그',
		description: '기간별 기록 조회',
		href: '/fridge/logs',
		icon: BarChart3,
	},
	{
		title: '맥주 관리',
		description: '배치/발효 일정 관리',
		href: '/beer',
		icon: Beer,
	},
];

export default function Home() {
	return (
		<Container className="min-h-dvh">
			<div className="flex flex-col gap-6">
				<header className="space-y-2">
					<h1 className="text-2xl font-semibold">Craft Brew</h1>
					<p className="text-sm text-muted-foreground">
						냉장고 상태와 로그, 맥주 배치를 한 곳에서 관리합니다.
					</p>
					<div className="flex flex-wrap gap-2">
						<Button
							asChild
							size="sm"
						>
							<Link href="/fridge">냉장고</Link>
						</Button>
						<Button
							asChild
							size="sm"
							variant="outline"
						>
							<Link href="/fridge/logs">로그</Link>
						</Button>
						<Button
							asChild
							size="sm"
							variant="outline"
						>
							<Link href="/beer">맥주</Link>
						</Button>
					</div>
				</header>

				<section className="grid gap-3 grid-cols-2">
					{quickLinks.map((item) => {
						const Icon = item.icon;
						return (
							<Link
								key={item.title}
								href={item.href}
								className="rounded-lg border border-border/70 bg-background/80 p-4 transition hover:bg-muted/30 aspect-square flex flex-col justify-center items-center gap-2"
							>
								<Icon className="size-12 text-muted-foreground" />
								<span className="text-sm font-medium">{item.title}</span>
								<p className="text-xs text-muted-foreground">
									{item.description}
								</p>
							</Link>
						);
					})}
				</section>
			</div>
		</Container>
	);
}
