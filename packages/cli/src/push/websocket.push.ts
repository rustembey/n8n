import type WebSocket from 'ws';
import { AbstractPush } from './abstract.push';

export type WebSocketConnection = WebSocket & { userId: string };

function heartbeat(this: WebSocket) {
	this.isAlive = true;
}

export class WebSocketPush extends AbstractPush<WebSocketConnection> {
	constructor(private readonly onMessage: (userId: string, msg: unknown) => void) {
		super();

		// Ping all connected clients every 60 seconds
		setInterval(() => this.pingAll(), 60 * 1000);
	}

	add(sessionId: string, connection: WebSocketConnection) {
		connection.isAlive = true;
		connection.on('pong', heartbeat);

		super.add(sessionId, connection);

		// Makes sure to remove the session if the connection is closed
		connection.once('close', () => {
			connection.off('pong', heartbeat);
			this.remove(sessionId);
		});

		connection.on('message', (data) => {
			try {
				const buffer = Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data);

				this.onMessage(connection.userId, JSON.parse(buffer.toString('utf8')));
			} catch (error) {
				console.error(error);
			}
		});
	}

	protected close(connection: WebSocket): void {
		connection.close();
	}

	protected sendToOne(connection: WebSocket, data: string): void {
		connection.send(data);
	}

	private pingAll() {
		for (const sessionId in this.connections) {
			const connection = this.connections[sessionId];
			// If a connection did not respond with a `PONG` in the last 60 seconds, disconnect
			if (!connection.isAlive) {
				delete this.connections[sessionId];
				return connection.terminate();
			}

			connection.isAlive = false;
			connection.ping();
		}
	}
}
