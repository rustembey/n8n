<template>
	<img
		:src="basePath + logoIcon"
		:class="$style.img"
		alt="n8n.io"
	/>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	computed: {
		basePath(): string {
			return this.$store.getters.getBaseUrl;
		},
		logoIcon(): string {
			return 'google-logo.svg';
		},
	},
});
</script>

<style lang="scss" module>
.img {
	height: 32px;
}
</style>
