/* eslint-disable @typescript-eslint/naming-convention */
import type {
	IWorkflowData,
	IWorkflowDb,
	PushDataUsersForWorkflow,
	PushDataWorkflowChangedPayload,
} from '@/Interface';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useCanvasStore, usePushConnectionStore, useUsersStore, useWorkflowsStore } from '@/stores';
import type { ConnectionTypes, IConnection } from 'n8n-workflow';
import * as NodeViewUtils from '@/utils/nodeViewUtils';

export const useCollaborationStore = defineStore('collaboration', () => {
	const workflowStore = useWorkflowsStore();
	const pushStore = usePushConnectionStore();
	const canvasStore = useCanvasStore();
	const usersStore = useUsersStore();
	const usersForWorkflows = ref<PushDataUsersForWorkflow>({});

	const workflowUsersUpdated = (data: PushDataUsersForWorkflow) => {
		usersForWorkflows.value = data;
	};

	const getUsersForCurrentWorkflow = () => {
		const currentWorkflowId = workflowStore.workflowId;
		return usersForWorkflows.value[currentWorkflowId]?.map((u) => u.user) || [];
	};

	const notifyWorkflowOpened = (workflowId: string) => {
		pushStore.send({
			type: 'workflowOpened',
			workflowId,
		});
	};

	const notifyWorkflowClosed = (workflowId: string) => {
		pushStore.send({ type: 'workflowClosed', workflowId });
	};

	const notifyWorkflowChanged = (workflow: IWorkflowData) => {
		pushStore.send({
			type: 'workflowChanged',
			workflowId: workflow.id,
			workflowJson: workflow,
		});
	};

	const onWorkflowChange = (messagePayload: PushDataWorkflowChangedPayload) => {
		const currentUserId = usersStore.currentUserId;
		if (messagePayload.editedByUserId !== currentUserId) {
			canvasStore.jsPlumbInstance.connections.forEach((c) => {
				canvasStore.jsPlumbInstance?.deleteConnection(c);
			});
			workflowStore.setWorkflow(messagePayload.workflowJson as IWorkflowDb);
			Object.entries(messagePayload.workflowJson.connections).forEach((c) => {
				const c1: IConnection = { node: c[0], type: 'main', index: 0 };
				const c2: IConnection = c[1]['main'][0][0];
				console.log(c1, c2);
				// __addConnection([c1, c2]);
			});
		}
	};

	const __addConnection = (connection: [IConnection, IConnection]) => {
		const outputUuid = getOutputEndpointUUID(
			connection[0].node,
			connection[0].type as ConnectionTypes,
			connection[0].index,
		);
		const inputUuid = getInputEndpointUUID(
			connection[1].node,
			connection[1].type as ConnectionTypes,
			connection[1].index,
		);
		if (!outputUuid || !inputUuid) {
			return;
		}

		const uuid: [string, string] = [outputUuid, inputUuid];
		console.log(outputUuid, ' --> ', inputUuid);
		// Create connections in DOM
		canvasStore.jsPlumbInstance?.connect({
			uuids: uuid,
		});
	};

	const getOutputEndpointUUID = (
			nodeName: string,
			connectionType: ConnectionTypes,
			index: number,
		): string | null => {
			const node = workflowStore.getNodeByName(nodeName);
			if (!node) {
				return null;
			}

			return NodeViewUtils.getOutputEndpointUUID(node.id, connectionType, index);
		},
		getInputEndpointUUID = (nodeName: string, connectionType: ConnectionTypes, index: number) => {
			const node = workflowStore.getNodeByName(nodeName);
			if (!node) {
				return null;
			}

			return NodeViewUtils.getInputEndpointUUID(node.id, connectionType, index);
		};

	return {
		usersForWorkflows,
		workflowUsersUpdated,
		getUsersForCurrentWorkflow,
		notifyWorkflowChanged,
		notifyWorkflowOpened,
		notifyWorkflowClosed,
		onWorkflowChange,
	};
});
