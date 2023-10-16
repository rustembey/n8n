import type { Request, Response } from 'express';
import type { WebSocket } from 'ws';

// TODO: move all push related types here

export type PushRequest = Request<{}, {}, {}, { sessionId: string }>;

export type SSEPushRequest = PushRequest & { ws: undefined; userId: string };
export type WebSocketPushRequest = PushRequest & { ws: WebSocket; userId: string };

export type PushResponse = Response & { req: PushRequest };
