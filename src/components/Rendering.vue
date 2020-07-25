<template>
	<div class="analysis">
		<div class="header">
			<h2>Rendering</h2>
			<div>
				<progress-bar :value="sumProgress" :full-width="true" />
			</div>
		</div>
		<div class="list">
			<div v-for="(progress, path) in rendering" :key="path" class="list-item">
				<div style="float: right">
					<progress-bar :value="progress" :success="progress >= 0.98 ? true : undefined" />
				</div>
				<div class="label">{{ path }}</div>
			</div>

			<!-- <button class="continue" :disabled="!isDone" @click="onContinue">Continue</button> -->
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { store } from '@/store'
import ProgressBar from './Progress.vue'

@Component({
	components: { ProgressBar }
})
export default class Analysis extends Vue {
	get rendering() {
		return store.state.renderingProgress
	}

	get sumProgress() {
		const entries = Object.entries(store.state.renderingProgress)
		let sum = 0
		entries.forEach(([path, progress]) => (sum += progress))

		if (!entries) return 0

		return sum / entries.length
	}
}
</script>

<style scoped>
.analysis {
	position: absolute;
	top: 10vh;
	bottom: 10vh;
	left: 10vw;
	right: 10vw;

	text-align: left;
}

.list {
	max-height: 100%;
	display: flex;
	flex-direction: column;
}
.list-item {
	background: #4d5160;
	border-radius: 2px;
	padding: 1rem;
	font-size: 1.2rem;

	margin-bottom: 0.5rem;

	display: flex;
	flex-direction: row-reverse;
}
.list-item .label {
	font-weight: bold;
	flex-grow: 2;
	overflow: hidden;

	white-space: nowrap;
	text-overflow: ellipsis;
	direction: rtl;
	text-align: left;
}

button.continue {
	height: 2rem;
	width: 10rem;
	font-weight: bold;

	color: white;
	background-color: #1a6ebb;
	border: 0;
	border-radius: 0.2rem;
	box-shadow: inset 0.1rem 0.1rem 0.2rem rgba(175, 175, 175, 0.25);
}
button.continue:disabled {
	background-color: #a3a3a3;
	box-shadow: initial;
}

.warning {
	margin-left: 1rem;
	font-size: 1rem;
}
</style>
