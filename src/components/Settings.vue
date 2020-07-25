<template>
	<div
		id="settings"
		@drop="onDrop"
		@dragover="onDragover"
		@dragenter="onDragenter"
		@dragleave="onDragleave"
		:class="isDragging && 'dragging'"
	>
		<div id="close-settings" @click="close">
			<fa icon="times" />
		</div>
		<div id="settings-body">
			<h2>Settings</h2>
			<div class="">
				<p>Select preset:</p>
				<div
					:class="['preset', selectedPreset === i && 'selected']"
					v-for="(preset, i) in presets"
					:key="i"
					@click="onSelect(i)"
				>
					<div class="select">
						<fa v-if="selectedPreset === i" icon="check-square" />
						<fa v-else :icon="['far', 'square']" />
					</div>
					<div class="name">{{ preset.name }}</div>
					<div class="delete" @click.stop="onRemove(i)">
						<fa icon="trash-alt" />
					</div>
				</div>
				<button class="button" @click="onAdd">Import preset</button>
				<p>FFMpeg Path:</p>
				<input type="text" class="file-input" v-model="ffmpegPath" />
				<p>FFProbe Path:</p>
				<input type="text" class="file-input" v-model="ffprobePath" />
			</div>
		</div>
		<div id="credit">Created by Balte de Wit</div>
	</div>
</template>

<script lang="ts">
import { Component, Vue, Emit } from 'vue-property-decorator'
import { store } from '../store'
// import { remote } from 'electron'
const { dialog } = require('electron').remote

@Component
export default class Settings extends Vue {
	private isDragging = false

	get presets() {
		return store.state.presets
	}

	get selectedPreset() {
		return store.state.settings.preset
	}
	set selectedPreset(v) {
		store.dispatch('updateSettings', { preset: v })
	}

	get ffmpegPath() {
		return store.state.settings.ffmpegPath
	}
	set ffmpegPath(v) {
		if (v === '') v = undefined
		store.dispatch('updateSettings', { ffmpegPath: v })
	}
	get ffprobePath() {
		return store.state.settings.ffprobePath
	}
	set ffprobePath(v) {
		if (v === '') v = undefined
		store.dispatch('updateSettings', { ffprobePath: v })
	}

	@Emit('close') close() {
		return
	}

	onDragenter() {
		this.isDragging = true
	}

	onDragover(ev: Event) {
		ev.preventDefault()
	}

	onDragleave() {
		this.isDragging = false
	}

	onDrop(ev: DragEvent): void {
		ev.preventDefault()
		this.isDragging = false
		if (!ev.dataTransfer) return
	}

	onRemove(index: number) {
		store.dispatch('removePreset', index)
	}

	onSelect(index: number) {
		this.selectedPreset = index
	}

	async onAdd() {
		const filePaths = await dialog.showOpenDialog({
			title: 'Import schedule',
			filters: [{ name: 'JSON', extensions: ['json'] }]
		})
		if (filePaths && filePaths.length) {
			store.dispatch('receivePresets', filePaths)
		}
	}
}
</script>

<style scoped>
#settings {
	position: absolute;
	top: 0;
	bottom: 0;
	left: 0;
	right: 0;
	z-index: 5;

	background: #343434;
}
#settings.dragging::before {
	position: absolute;
	top: 0;
	bottom: 0;
	left: 0;
	right: 0;
	z-index: 6;
	background: blue;
}

#settings-body {
	position: absolute;
	top: 10vw;
	bottom: 10vw;
	left: 10vw;
	right: 10vw;

	overflow-y: auto;

	text-align: left;
}

#settings-body h2 {
	margin-top: 0;
}

#settings-body .button {
	padding: 0.8rem 0.5rem;
	background: blue;
	border: 0;
	border-radius: 0.5rem;
	background: #525252;

	box-shadow: inset 2px 2px 4px rgba(175, 175, 175, 0.25);
	color: white;
	cursor: pointer;
}

#settings-body .preset {
	width: 100%;
	padding: 0.5rem;
	box-sizing: border-box;
	background-color: #4d5160;
	border-radius: 0.5rem;
	margin-bottom: 0.5rem;
	display: flex;
	cursor: pointer;
}
#settings-body .preset.selected {
	background-color: #1a6ebb;
}

#settings-body .preset > .select,
#settings-body .preset > .delete,
#settings-body .preset > .name {
	padding: 0 0.2rem;
}
#settings-body .preset > .select,
#settings-body .preset > .delete {
	flex-grow: 0;
}
#settings-body .preset > .name {
	flex-grow: 1;
}
#settings-body .preset > .delete {
	color: #afafaf;
}
#settings-body .preset > .delete:hover {
	color: white;
}

#close-settings {
	position: absolute;
	top: 0;
	right: 0;
	padding: 1rem;
	cursor: pointer;
	font-size: 2rem;
	color: #6b6b6b;
}
#close-settings:hover {
	text-decoration: underline;
	color: #fff;
}

.file-input {
	width: 100%;
	box-sizing: border-box;
	height: 2rem;
	background: #555555;
	color: white;
	border-radius: 0.5rem;
	border: solid 0px rgb(170, 170, 170);
	padding: 0.5rem;
	transition: border-width 80ms linear;
}
.file-input:focus {
	border-width: 1.5px;
	outline: none;
}

#credit {
	position: absolute;
	bottom: 0;
	height: 1.3rem;
	width: 100%;
	text-align: center;
	color: #6b6b6b;
}
</style>
