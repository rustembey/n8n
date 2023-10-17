import { Service } from 'typedi';
import { Push } from '../push';
import type {
	WorkflowChangedMessage,
	WorkflowClosedMessage,
	WorkflowElementFocusedMessage,
	WorkflowOpenedMessage,
} from './collaboration.message';
import {
	isWorkflowChangedMessage,
	isWorkflowClosedMessage,
	isWorkflowElementFocusedMessage,
	isWorkflowOpenedMessage,
} from './collaboration.message';
import { UserService } from '../services/user.service';
import type { IWorkflowUsersChanged } from '../Interfaces';

type WorkflowUserState = {
	userId: string;
	activeElementId: string | null;
};

type WorkflowJson = unknown;

type CollaborationState = {
	activeUsersByWorkflowId: Record<string, WorkflowUserState[]>;
	workflowDraftsByWorkflowId: Record<string, WorkflowJson>;
};

@Service()
export class CollaborationService {
	private readonly sessionIdByUserId: Record<string, string> = {};

	private state: CollaborationState = {
		activeUsersByWorkflowId: {},
		workflowDraftsByWorkflowId: {},
	};

	constructor(
		private readonly push: Push,
		private readonly userService: UserService,
	) {
		this.push.addMessageHandler((sessionId, userId, msg) => {
			this.sessionIdByUserId[userId] = sessionId;
			void this.handleUserMessage(userId, msg);
		});
	}

	private async handleUserMessage(userId: string, msg: unknown) {
		console.log('WS Message', userId, msg);

		if (isWorkflowOpenedMessage(msg)) {
			await this.handleWorkflowOpened(userId, msg);
		} else if (isWorkflowClosedMessage(msg)) {
			await this.handleWorkflowClosed(userId, msg);
		} else if (isWorkflowElementFocusedMessage(msg)) {
			await this.handleWorkflowElementFocused(userId, msg);
		} else if (isWorkflowChangedMessage(msg)) {
			await this.handleWorkflowChanged(userId, msg);
		}
	}

	async handleWorkflowChanged(_userId: string, msg: WorkflowChangedMessage) {
		const { workflowId, workflowJson } = msg;
		const { workflowDraftsByWorkflowId: workflowDraftsByWorkflowId } = this.state;

		workflowDraftsByWorkflowId[workflowId] = workflowJson;

		await this.sendWorkflowChangedMessage(workflowId);
	}

	async handleWorkflowOpened(userId: string, msg: WorkflowOpenedMessage) {
		const { workflowId } = msg;
		const { activeUsersByWorkflowId: activeUserByWorkflowId } = this.state;

		if (!activeUserByWorkflowId[workflowId]) {
			activeUserByWorkflowId[workflowId] = [];
		}

		if (!activeUserByWorkflowId[workflowId].some((user) => user.userId === userId)) {
			activeUserByWorkflowId[workflowId].push({
				userId,
				activeElementId: null,
			});
		}

		await this.sendWorkflowUsersChangedMessage();
		// Send the current draft state to the new user
		await this.sendWorkflowChangedMessage(workflowId, userId);
	}

	async handleWorkflowClosed(userId: string, msg: WorkflowClosedMessage) {
		const { workflowId } = msg;
		const { activeUsersByWorkflowId: activeUserByWorkflowId } = this.state;

		if (!activeUserByWorkflowId[workflowId]) {
			return;
		}

		activeUserByWorkflowId[workflowId] = activeUserByWorkflowId[workflowId].filter(
			(userState) => userState.userId !== userId,
		);

		if (activeUserByWorkflowId[workflowId].length === 0) {
			delete activeUserByWorkflowId[workflowId];
			// No users anymore editing this workflow, delete the draft
			delete this.state.workflowDraftsByWorkflowId[workflowId];
		}

		await this.sendWorkflowUsersChangedMessage();
	}

	async handleWorkflowElementFocused(userId: string, msg: WorkflowElementFocusedMessage) {
		const { workflowId, activeElementId } = msg;
		const { activeUsersByWorkflowId: activeUserByWorkflowId } = this.state;

		if (!activeUserByWorkflowId[workflowId]) {
			return;
		}

		const userState = activeUserByWorkflowId[workflowId].find((state) => state.userId === userId);
		if (!userState) {
			return;
		}

		userState.activeElementId = activeElementId;

		await this.sendWorkflowUsersChangedMessage();
	}

	async sendWorkflowUsersChangedMessage() {
		const userIds = Object.values(this.state.activeUsersByWorkflowId)
			.flat()
			.map((user) => user.userId);
		const users = await this.userService.getByIds(this.userService.getManager(), userIds);

		const usersByWorkflowId: IWorkflowUsersChanged['usersByWorkflowId'] = {};
		for (const [workflowId, workflowUserState] of Object.entries(
			this.state.activeUsersByWorkflowId,
		)) {
			usersByWorkflowId[workflowId] = workflowUserState.map((userState) => ({
				user: users.find((user) => user.id === userState.userId)!,
				activeElementId: userState.activeElementId,
			}));
		}

		this.push.send('workflowUsersChanged', usersByWorkflowId);
	}

	async sendWorkflowChangedMessage(workflowId: string, toUserId?: string) {
		const workflowJson = this.state.workflowDraftsByWorkflowId[workflowId];
		const message = { workflowId, workflowJson };

		if (toUserId === undefined) {
			this.push.send('workflowChanged', message);
		} else {
			const sessionId = this.sessionIdByUserId[toUserId];
			this.push.send('workflowChanged', message, sessionId);
		}
	}
}
