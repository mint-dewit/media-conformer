<template>
	<div>
		<template v-if="success !== undefined">
			<fa v-if="success" icon="check-circle" />
			<fa v-else icon="exclamation-triangle" />
			<!-- <span>{{ success ? 'Done' : 'Failed' }}</span> -->
		</template>
		<template v-else>
			<progress :value="tweenValue" :class="{ 'full-width': fullWidth }" />
		</template>
	</div>
</template>

<script lang="ts">
import Vue from 'vue'
import Component from 'vue-class-component'
import { Prop, Watch } from 'vue-property-decorator'

@Component
export default class ProgressBar extends Vue {
	@Prop() private value!: number
	@Prop() private success?: boolean
	@Prop() private fullWidth?: boolean

	private tweenValue = this.value

	@Watch('value')
	valueChanged(newValue: number, oldValue: number) {
		const delta = newValue - oldValue
		console.log(newValue, delta)

		let i = 5

		const tween = () => {
			i--

			this.tweenValue = newValue - delta * (i / 5)

			if (i > 0) window.requestAnimationFrame(tween)
		}
		window.requestAnimationFrame(tween)
	}
}
</script>

<style scoped>
progress {
	height: 0.5em;
	vertical-align: 0.03rem;
	-webkit-appearance: none;
	background-color: white;

	overflow: auto; /* TODO - not the prettiest thing */
}
progress::-webkit-progress-bar {
	background: #c4c4c4;
	box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.25);
}
progress::-webkit-progress-value {
	background: #1a6ebb;
	box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.25);
}
.full-width {
	width: 100%;
}
</style>
