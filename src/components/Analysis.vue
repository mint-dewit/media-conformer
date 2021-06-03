<template>
	<div class="analysis">
		<h2>Analysis</h2>
		<div class="list">
			<div v-for="path in files" :key="path" class="list-item">
				<label>{{ path }}</label>
				<div style="float: right">
					<progress-bar :value="progress(path)" :success="anomalies(path) | toResult" />
				</div>
				<div style="clear: both">
					<template v-for="(warning, i) in warnings(path)">
						<span :key="i" class="warning">{{ warning }}</span>
						<br :key="i" />
					</template>
				</div>
			</div>

			<button class="continue" :disabled="!isDone" @click="onContinue">Continue</button>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { store } from '@/store'
import ProgressBar from './Progress.vue'
import { Anomalies } from '../types/mediaInfo'

@Component({
	computed: {
		analysis() {
			return store.state.analysisResults
		},
		files() {
			return store.state.files
		},
		isDone() {
			return store.state.files.length === Object.values(store.state.analysisResults).length
		},
		progress() {
			return (file: string) => {
				return store.getters.getAnalysisProgress(file)
			}
		},
		anomalies() {
			return (file: string) => {
				return store.state.analysisResults[file]?.anomalies
			}
		},
		warnings() {
			return (file: string) => {
				const anomalies = store.state.analysisResults[file]?.anomalies
				if (!anomalies) return

				const pad = (t: number) => ('00' + Math.floor(t)).substr(-2)
				const toTimecode = (t: number) =>
					t >= 0 ? `${pad(t / 3600)}:${pad((t / 60) % 60)}:${pad((t % 3600) % 60)}` : '00:00:00'
				const result = [
					...(anomalies.freezes?.map(
						(a) => `Frozen frames from ${toTimecode(a.start)} to ${toTimecode(a.end)}`
					) || []),
					...(anomalies.blacks?.map(
						(a) => `Black frames from ${toTimecode(a.start)} to ${toTimecode(a.end)}`
					) || []),
					...(anomalies.silences?.map(
						(a) => `Silence from ${toTimecode(a.start)} to ${toTimecode(a.end)}`
					) || []),
					...(anomalies.borders?.map(
						(a) => `Black borders from ${toTimecode(a.start)} to ${toTimecode(a.end)}`
					) || [])
				]

				return result
			}
		}
	},
	components: { ProgressBar },
	filters: {
		toResult(value?: Anomalies) {
			if (!value) {
				return undefined
			} else {
				const result = Object.values(value).find((a) => {
					return a && a.length > 0
				})
				return !(result || []).length
			}
		}
	}
})
export default class Analysis extends Vue {
	onContinue() {
		store.dispatch('renderFiles')
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

	overflow: auto; /* TODO - not the prettiest thing */
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
}
.list-item label {
	font-weight: bold;
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
