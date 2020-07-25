<template>
	<div id="done">
		<div>
			<h3>All done</h3>
			<p>Click restart to process more files</p>

			<button class="button" @click="onClick">Restart</button>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { store } from '@/store'

@Component
export default class Done extends Vue {
	onClick(): void {
		store.dispatch('reset')
	}
}
</script>

<style scoped>
#done {
	position: absolute;
	top: 10vh;
	bottom: 10vh;
	left: 10vw;
	right: 10vw;

	display: flex;
	justify-content: center;
	flex-direction: column;
}

.fill {
	width: 100%;
	height: 100%;
}

.button {
	display: inline-block;
	background: #1a6ebb;
	color: white;
	box-shadow: inset 2px 2px 4px rgba(175, 175, 175, 0.25);
	border-radius: 4px;
	font-size: 1.2rem;
	line-height: 2.5rem;
	height: 2.5rem;
	padding-left: 0.5rem;
	padding-right: 0.5rem;
}
.pseudobutton::before {
	opacity: 1;
	content: 'Restart';
	display: inline-block;
	background: #1a6ebb;
	color: white;
	box-shadow: inset 2px 2px 4px rgba(175, 175, 175, 0.25);
	border-radius: 4px;
	font-size: 1.2rem;
	line-height: 2.5rem;
	height: 2.5rem;
	padding-left: 0.5rem;
	padding-right: 0.5rem;
}
</style>
