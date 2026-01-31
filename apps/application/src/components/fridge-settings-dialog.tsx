'use client';

import { useEffect, useState } from 'react';
import type { Command } from '@craft-brew/protocol';
import { sendFridgeCommand } from '@/api/fridge/action';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface FridgeSettingsDialogProps {
	targetTemp: number | null;
	peltierEnabled: boolean;
}

type CommandValue = number | boolean | null | undefined;

async function sendCommand(cmd: Command, value?: CommandValue) {
	const result = await sendFridgeCommand(cmd, value ?? null);
	if (!result.success) {
		throw new Error(result.error || 'Failed to send command');
	}
	return result;
}

export function FridgeSettingsDialog({
	targetTemp,
	peltierEnabled,
}: FridgeSettingsDialogProps) {
	const [open, setOpen] = useState(false);
	const [targetInput, setTargetInput] = useState('');
	const [peltierOn, setPeltierOn] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [feedback, setFeedback] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setTargetInput(
			targetTemp === null || Number.isNaN(targetTemp)
				? ''
				: targetTemp.toString(),
		);
		setPeltierOn(peltierEnabled);
		setFeedback(null);
	}, [open, targetTemp, peltierEnabled]);

	const onSave = async () => {
		setFeedback(null);
		const trimmed = targetInput.trim();
		const nextTarget = trimmed.length === 0 ? null : Number(trimmed);
		if (
			nextTarget !== null &&
			(!Number.isFinite(nextTarget) || nextTarget < 2 || nextTarget > 30)
		) {
			setFeedback('목표 온도는 2~30°C 범위로 입력해주세요.');
			return;
		}

		const commands: Array<Promise<unknown>> = [];
		if (targetTemp !== nextTarget) {
			commands.push(sendCommand('set_target', nextTarget));
		}
		if (peltierEnabled !== peltierOn) {
			commands.push(sendCommand('set_peltier', peltierOn));
		}

		if (commands.length === 0) {
			setFeedback('변경 사항이 없습니다.');
			return;
		}

		setIsSaving(true);
		try {
			await Promise.all(commands);
			setFeedback('설정을 전송했습니다.');
			setOpen(false);
		} catch (error) {
			setFeedback((error as Error).message);
		} finally {
			setIsSaving(false);
		}
	};

	const onRestart = async () => {
		const confirmed = window.confirm('냉장고를 재시작할까요?');
		if (!confirmed) {
			return;
		}
		setFeedback(null);
		setIsSaving(true);
		try {
			await sendCommand('restart');
			setFeedback('재시작 명령을 전송했습니다.');
			setOpen(false);
		} catch (error) {
			setFeedback((error as Error).message);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					size="sm"
					variant="outline"
				>
					설정
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>냉장고 설정</DialogTitle>
					<DialogDescription>
						목표 온도와 펠티어 작동 여부를 조정할 수 있습니다.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<div className="rounded-lg border bg-muted/40 p-4 space-y-3">
						<div className="flex flex-col gap-2">
							<Label htmlFor="fridge-target">목표 온도 (°C)</Label>
							<Input
								id="fridge-target"
								type="number"
								inputMode="decimal"
								step="0.1"
								min="2"
								max="30"
								placeholder="예: 8.0"
								value={targetInput}
								onChange={(event) => setTargetInput(event.target.value)}
							/>
							<p className="text-xs text-muted-foreground">
								비워두면 목표 온도를 해제합니다.
							</p>
						</div>
					</div>
					<div className="rounded-lg border bg-muted/40 p-4 space-y-3">
						<div className="flex items-center justify-between gap-4">
							<div>
								<Label htmlFor="fridge-peltier">펠티어 작동</Label>
								<p className="text-xs text-muted-foreground">
									펠티어를 끄면 목표 온도 명령이 거부될 수 있습니다.
								</p>
							</div>
							<Switch
								id="fridge-peltier"
								checked={peltierOn}
								onCheckedChange={setPeltierOn}
								aria-label="펠티어 작동"
							/>
						</div>
						<div className="flex items-center justify-between gap-4">
							<div>
								<Label>재시작</Label>
								<p className="text-xs text-muted-foreground">
									즉시 재부팅합니다. 필요할 때만 사용하세요.
								</p>
							</div>
							<Button
								variant="destructive"
								size="sm"
								onClick={onRestart}
								disabled={isSaving}
							>
								재시작
							</Button>
						</div>
					</div>
					{feedback && (
						<p className="text-xs text-muted-foreground">{feedback}</p>
					)}
				</div>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">닫기</Button>
					</DialogClose>
					<Button
						onClick={onSave}
						disabled={isSaving}
					>
						{isSaving ? '전송 중...' : '적용'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
