// stuff for connecting frontend and backend
import { ipcMain, BrowserWindow } from 'electron'
import path from 'path'
import { WorkStep, RenderWorkstep } from './workStep'
import { Analyzer } from './analyzer'
import { ProgressReport } from '@/types/api'
import { Renderer } from './renderer'
import { Analysis } from '@/types/mediaInfo'
import { Config } from '@/types/config'

export class API {
	analyzer: Analyzer | undefined
	renderer: Renderer | undefined

	private _windows: { [id: number]: BrowserWindow } = {}
	private _id = 0
	private config: Config | undefined

	constructor() {
		ipcMain.on('config', (_ev: any, config: Config) => {
			if (!this.config) {
				this.analyzer = new Analyzer(config)
				this.renderer = new Renderer(config)
			} else {
				this.analyzer!.config = config
				this.renderer!.config = config
			}
			console.log(config)
			this.config = config
		})
		ipcMain.on('analyse', async (ev: any, file: string) => {
			console.log('Asked to analyse', file)
			if (!this.analyzer) return

			const worker = new WorkStep(file)
			worker.on('progressReport', (report) => {
				this._reportProgress('analysis', report)
			})

			const analysis = await this.analyzer.analyzeFile(worker)

			ev.reply('analysis', { path: file, analysis })
		})

		ipcMain.on(
			'startRender',
			async (ev: any, { file, analysis }: { file: string; analysis: Analysis }) => {
				console.log('Asked to render', file)
				if (!(this.config && this.renderer)) return

				const workers = this._createRenderSteps(file, analysis)

				workers.forEach((w) =>
					w.on('progressReport', (report) => {
						this._reportProgress('renderer', report)
					})
				)

				// TODO - handle these errors better
				await Promise.all(workers.map((w) => this.renderer!.renderFile(w).catch(() => null)))

				ev.reply('rendered', { path: file, outputs: workers.map((w) => w.output) })
			}
		)
	}

	registerWindow(window: BrowserWindow) {
		this._windows[this._id] = window
		this._id++

		window.webContents.send('getConfig')

		return this._id
	}

	unregisterWindow(id: number) {
		delete this._windows[id]
	}

	private _reportProgress(
		type: 'analysis' | 'renderer',
		{ path, progress }: { path: string; progress: number }
	) {
		const progressReport: ProgressReport = {
			type,
			progress,
			path
		}
		Object.values(this._windows).forEach((w) => {
			w.webContents.send('progressReport', progressReport)
		})
	}

	private _createRenderSteps(file: string, analysis: Analysis) {
		return this.config!.encoders.map((encoderConfig) => {
			const p = path.parse(file)
			const output = `${p.dir}/${p.name}${encoderConfig.postFix}${encoderConfig.extension || p.ext}`
			return new RenderWorkstep(file, output, encoderConfig, analysis)
		})
	}
}
