import Link from 'next/link';
import {
	Thermometer,
	BarChart3,
	Settings2,
	Beer,
	Refrigerator,
	Command,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/page-header';

const quickLinks = [
	{
		title: '냉장고',
		description: '냉장고 상태와 로그, 맥주 배치를 한 곳에서 관리합니다.',
		href: '/fridge',
		icon: Refrigerator,
	},
	{
		title: '맥주 관리',
		description: '배치/발효 일정 관리',
		href: '/beer',
		icon: Beer,
	},
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
		title: '커맨드 로그',
		description: '커맨드 실행 기록 조회',
		href: '/fridge/commands',
		icon: Command,
	},
];

export default function Home() {
	return (
		<Container className="min-h-dvh">
			<PageHeader title="Craft Brew" />
			<div className="flex flex-col gap-6 py-6">
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
								<p className="text-xs text-muted-foreground text-center">
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
