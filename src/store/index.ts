import Vuex from 'vuex'
import { ipcRenderer, IpcMessageEvent } from 'electron'
import * as fs from 'fs'
import { ProgressReport, AnalysisResult, RenderingResult } from '@/types/api'
import { Analysis } from '@/types/mediaInfo'
import Vue from 'vue'
import { Preset, Config } from '@/types/config'

export enum Steps {
	FilePicker,
	Analysis,
	Rendering,
	Done
}

export interface MediaConformerStore {
	step: Steps
	files: Array<string>
	analysisProgress: { [path: string]: number }
	analysisResults: { [path: string]: Analysis }
	renderingProgress: { [path: string]: number }

	settings: {
		preset: number
		ffmpegPath?: string
		ffprobePath?: string
	}
	presets: Array<Preset>
}

export const store = new Vuex.Store<MediaConformerStore>({
	state: {
		step: Steps.FilePicker,
		files: [],
		analysisProgress: {},
		analysisResults: {},
		renderingProgress: {},

		settings: {
			preset: 0
		},
		presets: [
			{
				name: 'Test preset',
				encoders: []
			}
		]
	},
	getters: {
		getAnalysisProgress: (state) => (file: string) => state.analysisProgress[file] || 0
	},
	mutations: {
		setStep(state, newStep: Steps) {
			state.step = newStep
		},

		addFile(state, file: string) {
			state.files.push(file)
		},

		setAnalysisProgress(state, { path, progress }) {
			Vue.set(state.analysisProgress, path, progress)
		},

		setRenderingProgress(state, { path, progress }) {
			Vue.set(state.renderingProgress, path, progress)
		},

		setAnalysis(state, { path, analysis }) {
			Vue.set(state.analysisResults, path, analysis)
		},

		resetFiles(state) {
			Vue.set(state, 'files', [])
		},

		resetAnalysisProgress(state) {
			Vue.set(state, 'analysisProgress', {})
		},

		resetAnalysisResults(state) {
			Vue.set(state, 'analysisResults', {})
		},

		resetRenderingProgress(state) {
			Vue.set(state, 'renderingProgress', {})
		},

		updateSettings(state, payload: Partial<MediaConformerStore['settings']>) {
			Vue.set(state, 'settings', {
				...state.settings,
				...payload
			})
		},

		addPreset(state, preset: Preset) {
			state.presets.push(preset)
		},

		removePreset(state, index: number) {
			state.presets.splice(index, 1)
			let curIndex = state.settings.preset

			if (index < curIndex) {
				Vue.set(state.settings, 'preset', --curIndex)
			} else if (index === curIndex && index === state.presets.length) {
				Vue.set(state.settings, 'preset', --curIndex)
			}
		},

		loadSettings(
			state,
			settings: {
				settings: MediaConformerStore['settings']
				presets: MediaConformerStore['presets']
			}
		) {
			Vue.set(state, 'settings', settings.settings)
			Vue.set(state, 'presets', settings.presets)
		}
	},
	actions: {
		receiveFiles({ commit }, files: Array<string>) {
			files.forEach((f) => commit('addFile', f))
			commit('setStep', Steps.Analysis)

			files.forEach((f) => ipcRenderer.send('analyse', f))
		},
		renderFiles({ commit, state }) {
			commit('setStep', Steps.Rendering)

			// wait for UI to transition, then send command
			setTimeout(() => {
				state.files.forEach((f) =>
					ipcRenderer.send('startRender', {
						file: f,
						analysis: state.analysisResults[f]
					})
				)
			}, 300)
		},
		updateSettings({ commit }, payload: Partial<MediaConformerStore['settings']>) {
			commit('updateSettings', payload)

			debouncedSendSettings()
		},
		async receivePresets({ commit }, files: Array<string>) {
			const ps: Array<Promise<void>> = []
			files.forEach((f) => {
				ps.push(
					new Promise((resolve) => {
						try {
							const file = fs.readFileSync(f, { encoding: 'utf8' })
							const preset = JSON.parse(file)
							// verify if it is a preset: needs at least a name and encoders
							if (!preset.name || !preset.encoders || !preset.encoders.length) {
								console.log('invalid config', preset)
								resolve()
								return
							}
							commit('addPreset', preset)
							resolve()
						} catch (e) {
							// report to user
						}
					})
				)
			})
			await Promise.all(ps)

			debouncedSendSettings()
		},
		removePreset({ commit }, index) {
			commit('removePreset', index)

			debouncedSendSettings()
		},
		reset({ commit }) {
			commit('resetFiles')
			commit('resetAnalysisProgress')
			commit('resetAnalysisResults')
			commit('resetRenderingProgress')
			commit('setStep', Steps.FilePicker)
		}
	}
})

let timeout: NodeJS.Timeout | null = null
function debouncedSendSettings() {
	if (timeout) clearTimeout(timeout)
	timeout = setTimeout(() => {
		sendSettings()
		saveSettingsAndPresets()
	}, 500)
}

function sendSettings() {
	console.log('sendign config')
	const config: Config = {
		...store.state.presets[store.state.settings.preset]
	}

	if (store.state.settings.ffmpegPath || store.state.settings.ffprobePath) {
		config.paths = {
			ffmpeg: store.state.settings.ffmpegPath,
			ffprobe: store.state.settings.ffprobePath
		}
	}

	ipcRenderer.send('config', config)
}

function saveSettingsAndPresets() {
	localStorage.setItem(
		'settings',
		JSON.stringify({
			settings: store.state.settings,
			presets: store.state.presets
		})
	)
}

function loadSettingsAndPresets() {
	const item = localStorage.getItem('settings')
	if (item) {
		try {
			const settings = JSON.parse(item)
			store.commit('loadSettings', settings)
		} catch (e) {
			// nothing to worry about
		}
	}
}

ipcRenderer.on('getConfig', () => {
	sendSettings()
})

ipcRenderer.on(
	'progressReport',
	(_ev: IpcMessageEvent, { path, progress, type }: ProgressReport) => {
		if (type === 'analysis') {
			store.commit('setAnalysisProgress', { path, progress })
		} else {
			store.commit('setRenderingProgress', { path, progress })
		}
	}
)

ipcRenderer.on('analysis', (_ev: IpcMessageEvent, { path, analysis }: AnalysisResult) => {
	// console.log(analysis)
	store.commit('setAnalysis', { path, analysis })
})
ipcRenderer.on('rendered', (_ev: IpcMessageEvent, { path, outputs }: RenderingResult) => {
	console.log('Done rendering', path)
	outputs.forEach((output) => {
		store.commit('setRenderingProgress', { path: output, progress: 1 })
	})

	const unfunished = Object.entries(store.state.renderingProgress).find(
		([path, progress]) => progress < 1 && path
	)
	if (!unfunished) {
		store.commit('setStep', Steps.Done)
	}
})

loadSettingsAndPresets()
sendSettings()
