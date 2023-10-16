export type CollaborationMessage = WorkflowOpenedMessage;

export type WorkflowOpenedMessage = {
	type: 'workflowOpened';
	workflowId: string;
};

export const isWorkflowOpenedMessage = (msg: unknown): msg is WorkflowOpenedMessage => {
	return typeof msg === 'object' && msg !== null && 'type' in msg && msg.type === 'workflowOpened';
};
