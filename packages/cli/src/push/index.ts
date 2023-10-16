import { EventEmitter } from 'events';
import { ServerResponse } from 'http';
import type { Server } from 'http';
import type { Socket } from 'net';
import type { Application, RequestHandler } from 'express';
import { Server as WSServer } from 'ws';
import { parse as parseUrl } from 'url';
import { Container, Service } from 'typedi';
import config from '@/config';
import { resolveJwt } from '@/auth/jwt';
import { AUTH_COOKIE_NAME } from '@/constants';
import { SSEPush } from './sse.push';
import type { WebSocketConnection } from './websocket.push';
import { WebSocketPush } from './websocket.push';
import type { PushResponse, SSEPushRequest, WebSocketPushRequest } from './types';
import type { IPushDataType } from '@/Interfaces';

const useWebSockets = config.getEnv('push.backend') === 'websocket';

type MessageHandler = (userId: string, msg: unknown) => void;

@Service()
export class Push extends EventEmitter {
	private messageHandlers: MessageHandler[] = [];

	private backend = useWebSockets
		? new WebSocketPush((userId, msg) => this.onMessage(userId, msg))
		: new SSEPush();

	handleRequest(req: SSEPushRequest | WebSocketPushRequest, res: PushResponse) {
		if (req.ws) {
			const ws: WebSocketConnection = req.ws as any;
			ws.userId = req.userId;
			(this.backend as WebSocketPush).add(req.query.sessionId, ws);
		} else if (!useWebSockets) {
			(this.backend as SSEPush).add(req.query.sessionId, { req, res });
		} else {
			res.status(401).send('Unauthorized');
		}
		this.emit('editorUiConnected', req.query.sessionId);
	}

	send<D>(type: IPushDataType, data: D, sessionId: string | undefined = undefined) {
		this.backend.send(type, data, sessionId);
	}

	addMessageHandler(handler: MessageHandler) {
		this.messageHandlers.push(handler);
	}

	private onMessage(userId: string, msg: unknown) {
		this.messageHandlers.forEach((handler) => handler(userId, msg));
	}
}

export const setupPushServer = (restEndpoint: string, server: Server, app: Application) => {
	if (useWebSockets) {
		const wsServer = new WSServer({ noServer: true });
		server.on('upgrade', (request: WebSocketPushRequest, socket: Socket, head) => {
			if (parseUrl(request.url).pathname === `/${restEndpoint}/push`) {
				wsServer.handleUpgrade(request, socket, head, (ws) => {
					request.ws = ws;

					const response = new ServerResponse(request);
					response.writeHead = (statusCode) => {
						if (statusCode > 200) ws.close();
						return response;
					};

					// @ts-ignore
					// eslint-disable-next-line @typescript-eslint/no-unsafe-call
					app.handle(request, response);
				});
			}
		});
	}
};

export const setupPushHandler = (restEndpoint: string, app: Application) => {
	const endpoint = `/${restEndpoint}/push`;

	const pushValidationMiddleware: RequestHandler = async (
		req: SSEPushRequest | WebSocketPushRequest,
		res,
		next,
	) => {
		const ws = req.ws;

		const { sessionId } = req.query;
		if (sessionId === undefined) {
			if (ws) {
				ws.send('The query parameter "sessionId" is missing!');
				ws.close(1008);
			} else {
				next(new Error('The query parameter "sessionId" is missing!'));
			}
			return;
		}
		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			const authCookie: string = req.cookies?.[AUTH_COOKIE_NAME] ?? '';
			const user = await resolveJwt(authCookie);
			req.userId = user.id;
		} catch (error) {
			if (ws) {
				ws.send(`Unauthorized: ${(error as Error).message}`);
				ws.close(1008);
			} else {
				res.status(401).send('Unauthorized');
			}
			return;
		}

		next();
	};

	const push = Container.get(Push);
	app.use(
		endpoint,
		pushValidationMiddleware,
		(req: SSEPushRequest | WebSocketPushRequest, res: PushResponse) => push.handleRequest(req, res),
	);
};
