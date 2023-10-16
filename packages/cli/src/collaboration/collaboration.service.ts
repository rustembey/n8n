import { Service } from 'typedi';
import { Push } from '../push';
import type { WorkflowOpenedMessage } from './collaboration.message';
import { isWorkflowOpenedMessage } from './collaboration.message';
import { UserService } from '../services/user.service';
import type { User } from '../databases/entities/User';

type CollaborationState = {
	activeUsersByWorkflowId: Record<string, string[]>;
};

@Service()
export class CollaborationService {
	private state: CollaborationState = {
		activeUsersByWorkflowId: {},
	};

	constructor(
		private readonly push: Push,
		private readonly userService: UserService,
	) {
		this.push.addMessageHandler((userId, msg) => {
			void this.handleUserMessage(userId, msg);
		});
	}

	private async handleUserMessage(userId: string, msg: unknown) {
		console.log('WS Message', userId, msg);

		if (isWorkflowOpenedMessage(msg)) {
			await this.handleWorkflowOpened(userId, msg);
		}
	}

	async handleWorkflowOpened(userId: string, msg: WorkflowOpenedMessage) {
		const { workflowId } = msg;
		const { activeUsersByWorkflowId: activeUserByWorkflowId } = this.state;

		if (!activeUserByWorkflowId[workflowId]) {
			activeUserByWorkflowId[workflowId] = [];
		}

		if (!activeUserByWorkflowId[workflowId].includes(userId)) {
			activeUserByWorkflowId[workflowId].push(userId);
		}

		await this.sendWorkflowUsersMessage();
	}

	async sendWorkflowUsersMessage() {
		const userIds = Object.values(this.state.activeUsersByWorkflowId).flat();
		const users = await this.userService.getByIds(this.userService.getManager(), userIds);

		const usersByWorkflowId: Record<string, User[]> = {};
		for (const [workflowId, workflowUserIds] of Object.entries(
			this.state.activeUsersByWorkflowId,
		)) {
			usersByWorkflowId[workflowId] = users.filter((user) => workflowUserIds.includes(user.id));
		}

		this.push.send('workflowUsersChanged', usersByWorkflowId);
	}
}
