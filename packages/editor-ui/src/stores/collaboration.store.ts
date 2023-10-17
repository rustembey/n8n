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
			workflowStore.setWorkflow(messagePayload.workflowJson as IWorkflowDb);
			// canvasStore.jsPlumbInstance?.setSuspendDrawing(true, true);
			// Object.entries(messagePayload.workflowJson.connections).forEach((c) => {
			// 	const c1: IConnection = { node: c[0], type: 'main', index: 0 };
			// 	const c2: IConnection = c[1].main[0][0];
			// 	console.log(c1, c2);
			// 	connectTwoNodes(c1.node, c1.index, c2.node, c2.index, c1.type as ConnectionTypes);
			// });
			// canvasStore.jsPlumbInstance?.setSuspendDrawing(false, true);
			setTimeout(() => {
				canvasStore.jsPlumbInstance?.repaintEverything();
			}, 20);
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

	const getConnection = (
		sourceNodeName: string,
		sourceNodeOutputIndex: number,
		targetNodeName: string,
		targetNodeOuputIndex: number,
		type: ConnectionTypes,
	): IConnection | undefined => {
		const nodeConnections = workflowStore.outgoingConnectionsByNodeName(sourceNodeName)[type];
		if (nodeConnections) {
			const connections: IConnection[] | null = nodeConnections[sourceNodeOutputIndex];

			if (connections) {
				return connections.find(
					(connection: IConnection) =>
						connection.node === targetNodeName && connection.index === targetNodeOuputIndex,
				);
			}
		}

		return undefined;
	};

	const connectTwoNodes = (
		sourceNodeName: string,
		sourceNodeOutputIndex: number,
		targetNodeName: string,
		targetNodeOutputIndex: number,
		type: ConnectionTypes,
	) => {
		const sourceNode = workflowStore.getNodeByName(sourceNodeName);
		const targetNode = workflowStore.getNodeByName(targetNodeName);

		if (
			getConnection(
				sourceNodeName,
				sourceNodeOutputIndex,
				targetNodeName,
				targetNodeOutputIndex,
				type,
			)
		) {
			console.log('Connection already exists');
			return;
		}

		const connectionData = [
			{
				node: sourceNodeName,
				type,
				index: sourceNodeOutputIndex,
			},
			{
				node: targetNodeName,
				type,
				index: targetNodeOutputIndex,
			},
		] as [IConnection, IConnection];

		__addConnection(connectionData);
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
