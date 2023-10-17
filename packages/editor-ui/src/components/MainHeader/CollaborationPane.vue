<script setup lang="ts">
import { useCollaborationStore } from '@/stores';
import { computed } from 'vue';

const collaborationStore = useCollaborationStore();

const activeUsers = computed(() => {
	return collaborationStore.getUsersForCurrentWorkflow();
});
</script>

<template>
	<div :class="$style.container">
		<el-dropdown v-if="activeUsers.length > 0" trigger="click">
			<el-badge :value="activeUsers.length" class="item">
				<n8n-icon-button type="tertiary" icon="users" size="large" text />
			</el-badge>
			<template #dropdown>
				<el-dropdown-menu>
					<el-dropdown-item v-for="user in activeUsers" :key="user.id">
						<div :class="$style.itemContainer">
							<n8n-avatar
								:firstName="user.user.firstName"
								:lastName="user.user.lastName"
								size="small"
							/>
							<span>{{ user.user.firstName }} {{ user.user.lastName }}</span>
							<font-awesome-icon v-if="user.user.globalRoleId === 1" icon="crown" />
						</div>
					</el-dropdown-item>
				</el-dropdown-menu>
			</template>
		</el-dropdown>
	</div>
</template>

<style lang="scss" module>
.container {
	sup {
		top: 10px !important;
		right: 15px !important;
	}
}
.itemContainer {
	display: flex;
	gap: 5px;
	align-items: center;

	& + & {
		margin-bottom: 20px;
	}
}
</style>
