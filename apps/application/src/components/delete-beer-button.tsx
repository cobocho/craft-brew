'use client';

import { Button } from '@/components/ui/button';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { deleteBeer } from '@/api/beer/action';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

interface DeleteBeerButtonProps {
	beerId: number;
	beerName: string;
}

export function DeleteBeerButton({ beerId, beerName }: DeleteBeerButtonProps) {
	const router = useRouter();
	const [isDeleting, setIsDeleting] = useState(false);

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			const result = await deleteBeer(beerId);

			if (result.success) {
				toast.success(`"${beerName}" 맥주가 삭제되었습니다.`);
				router.push('/beer');
			} else {
				toast.error(result.error || '맥주 삭제에 실패했습니다.');
			}
		} catch (error) {
			toast.error('맥주 삭제 중 오류가 발생했습니다.');
			console.error(error);
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					disabled={isDeleting}
					className="hover:bg-destructive/10 hover:text-destructive"
				>
					<Trash2 className="w-4 h-4" />
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>맥주를 삭제하시겠습니까?</AlertDialogTitle>
					<AlertDialogDescription>
						<span className="font-semibold">{beerName}</span> 맥주를 삭제하면 복구할
						수 없습니다. 정말 삭제하시겠습니까?
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>취소</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleDelete}
						variant="destructive"
					>
						삭제
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
