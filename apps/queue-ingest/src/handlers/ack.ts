import chalk from 'chalk';
import { AckPayload } from '@craft-brew/protocol';
import { db, commands, settings } from '@craft-brew/database';
import { eq } from 'drizzle-orm';

export async function handleAck(payload: string) {
	try {
		const ack = JSON.parse(payload) as AckPayload;
		const value = ack.value?.toString() ?? null;

		if (ack.success) {
			console.log(
				chalk.green('[ACK]'),
				`cmd=${ack.cmd}`,
				`id=${ack.id} value=${value}`,
			);

			// upsert
			await db
				.insert(commands)
				.values({
					cmd_id: ack.id,
					type: ack.cmd,
					ts: new Date(ack.ts * 1000),
					value: value,
					completed: true,
					completed_at: new Date(ack.ts * 1000),
				})
				.onConflictDoUpdate({
					target: [commands.cmd_id],
					set: {
						completed: true,
						value: value,
						completed_at: new Date(ack.ts * 1000),
					},
				});

			if (!value) {
				return;
			}

			switch (ack.cmd) {
				case 'set_target':
					await db
						.update(settings)
						.set({
							targetTemp: value,
						})
						.where();
					break;
				case 'set_peltier':
					break;
				case 'restart':
					break;
			}
		}

		if (!ack.success) {
			console.log(
				chalk.yellow('[ACK]'),
				`cmd=${ack.cmd}`,
				`id=${ack.id}`,
				`error=${ack.error}`,
			);
			await db
				.insert(commands)
				.values({
					cmd_id: ack.id,
					type: ack.cmd,
					ts: new Date(ack.ts * 1000),
					value: value,
					completed: false,
					error: ack.error,
				})
				.onConflictDoUpdate({
					target: [commands.cmd_id],
					set: {
						completed: false,
						error: ack.error,
					},
				});
		}
	} catch (error) {
		console.error(
			chalk.redBright('[ACK] error:'),
			chalk.red((error as Error).message),
		);
	}
}
