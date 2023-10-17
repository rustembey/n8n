export type CollaborationMessage =
	| WorkflowOpenedMessage
	| WorkflowClosedMessage
	| WorkflowElementFocusedMessage
	| WorkflowChangedMessage;

export type WorkflowOpenedMessage = {
	type: 'workflowOpened';
	workflowId: string;
};

export type WorkflowClosedMessage = {
	type: 'workflowClosed';
	workflowId: string;
};

export type WorkflowElementFocusedMessage = {
	type: 'workflowElementFocused';
	workflowId: string;
	activeElementIds: string[];
};

export type WorkflowChangedMessage = {
	type: 'workflowChanged';
	workflowId: string;
	workflowJson: unknown;
};

const isWorkflowMessage = (msg: unknown): msg is CollaborationMessage => {
	return typeof msg === 'object' && msg !== null && 'type' in msg;
};

export const isWorkflowOpenedMessage = (msg: unknown): msg is WorkflowOpenedMessage => {
	return isWorkflowMessage(msg) && msg.type === 'workflowOpened';
};

export const isWorkflowClosedMessage = (msg: unknown): msg is WorkflowClosedMessage => {
	return isWorkflowMessage(msg) && msg.type === 'workflowClosed';
};

export const isWorkflowElementFocusedMessage = (
	msg: unknown,
): msg is WorkflowElementFocusedMessage => {
	return isWorkflowMessage(msg) && msg.type === 'workflowElementFocused';
};

export const isWorkflowChangedMessage = (msg: unknown): msg is WorkflowChangedMessage => {
	return isWorkflowMessage(msg) && msg.type === 'workflowChanged';
};
