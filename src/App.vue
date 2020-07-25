<template>
	<div id="app">
		<Settings v-if="showSettings" @close="closeSettings" />
		<div v-if="step === 0" id="open-settings" @click="openSettings">
			<fa icon="cog" />
		</div>
		<transition name="slide-fade">
			<FilePicker v-if="step === 0" />
			<Analysis v-if="step === 1" />
			<Rendering v-if="step === 2" />
			<Done v-if="step === 3" />
		</transition>
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import FilePicker from './components/FilePicker.vue'
import Analysis from './components/Analysis.vue'
import Rendering from './components/Rendering.vue'
import Done from './components/Done.vue'
import Settings from './components/Settings.vue'
import { store } from '@/store'

@Component({
	components: {
		FilePicker,
		Analysis,
		Rendering,
		Done,
		Settings
	},
	computed: {
		step() {
			return store.state.step
		}
	}
})
export default class App extends Vue {
	private showSettings = false

	openSettings() {
		this.showSettings = true
	}
	closeSettings() {
		this.showSettings = false
	}
}
</script>

<style>
#app {
	font-family: Avenir, Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-align: center;
	color: white;

	position: absolute;
	top: 0;
	bottom: 0;
	left: 0;
	right: 0;

	background: #343434;
	overflow: hidden;
}

#open-settings {
	position: absolute;
	top: 0;
	right: 0;
	padding: 1rem;
	cursor: pointer;
	font-size: 2rem;

	color: #6b6b6b;
}
#open-settings:hover {
	text-decoration: underline;
	color: #fff;
}

/* Enter and leave animations can use different */
/* durations and timing functions.              */
.slide-fade-enter-active {
	transition: all 0.3s ease;
}
.slide-fade-leave-active {
	transition: all 0.3s cubic-bezier(0.51, 0.2, 0.83, 0.67);
}
.slide-fade-enter {
	transform: translateX(100vw);
	opacity: 0;
}
.slide-fade-leave-to
/* .slide-fade-leave-active below version 2.1.8 */ {
	transform: translateX(-100vw);
	opacity: 0;
}
</style>
