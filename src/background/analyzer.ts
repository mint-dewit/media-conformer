// analyzer bits
import { noTryAsync } from 'no-try'
import { exec, spawn, ChildProcess } from 'child_process'
import { WorkStep } from './workStep'
import {
	MediaInfo,
	Analysis,
	Anomaly,
	LoudnessInfo,
	FieldOrder,
	Anomalies
} from '@/types/mediaInfo'
import { literal } from './util'
import { Config } from '@/types/config'
import { EventEmitter } from 'events'

export class Analyzer extends EventEmitter {
	config: Config
	logger: any = console

	private _steps: number

	constructor(config: Config) {
		super()
		this.config = config

		this._steps = 1 // for basic analysis
		if (this.config.interlaced) this._steps++
		if (
			this.config.blackFrames ||
			this.config.freezeFrames ||
			this.config.borders ||
			this.config.silence
		)
			this._steps++
		if (this.config.loudness) this._steps++
	}

	async analyzeFile(step: WorkStep): Promise<Analysis> {
		step.progressSteps += this._steps

		const info = await this.analyzeFormat(step)
		step.completed()

		if (step.failed || info === null) {
			throw new Error('Step failed to run')
		}

		const analysis: Analysis = {
			info,
			anomalies: {}
		}

		if (this.config.interlaced) {
			analysis.info.field_order = await this.analyzeInterlacing(step)

			step.completed()
		}

		if (
			this.config.blackFrames ||
			this.config.freezeFrames ||
			this.config.borders ||
			this.config.silence
		) {
			analysis.anomalies = await this.analyzeAnomalies(
				step,
				Number(analysis.info.format!.duration || 0)
			)

			step.completed()
		}

		if (this.config.loudness) {
			analysis.info.loudness = (await this.analyzeLoudness(step)) || undefined

			step.completed()
		}

		return analysis
	}

	async analyzeFormat(step: WorkStep): Promise<MediaInfo | null> {
		const args = [
			(this.config.paths && this.config.paths.ffprobe) || process.platform === 'win32'
				? 'ffprobe.exe'
				: 'ffprobe',
			'-hide_banner',
			'-i',
			`"${step.input}"`,
			'-show_streams',
			'-show_format',
			'-print_format',
			'json'
		]

		const { result: probeData, error: execError } = await noTryAsync(
			() =>
				new Promise<any>((resolve, reject) => {
					exec(args.join(' '), (err, stdout, stderr) => {
						this.logger.debug(`Worker: metadata generate: output (stdout, stderr)`, stdout, stderr)
						if (err) {
							return reject(err)
						}
						const json: any = JSON.parse(stdout)
						if (!json.streams || !json.streams[0]) {
							return reject(new Error('not media'))
						}
						resolve(json)
					})
				})
		)

		if (execError) {
			step.failStep(`External process to generate metadata failed`, execError)
			return null
		}

		this.logger.info(`Worker: metadata generate: generated metadata for "${step.input}"`)
		this.logger.debug(`Worker: metadata generate: generated metadata details`, probeData)

		let newInfo = literal<MediaInfo>({
			name: step.input,

			streams: probeData.streams.map((s: any) => ({
				codec: {
					long_name: s.codec_long_name,
					type: s.codec_type,
					time_base: s.codec_time_base,
					tag_string: s.codec_tag_string,
					is_avc: s.is_avc
				},

				// Video
				width: s.width,
				height: s.height,
				sample_aspect_ratio: s.sample_aspect_ratio,
				display_aspect_ratio: s.display_aspect_ratio,
				pix_fmt: s.pix_fmt,
				bits_per_raw_sample: s.bits_per_raw_sample,

				// Audio
				sample_fmt: s.sample_fmt,
				sample_rate: s.sample_rate,
				channels: s.channels,
				channel_layout: s.channel_layout,
				bits_per_sample: s.bits_per_sample,

				// Common
				time_base: s.time_base,
				start_time: s.start_time,
				duration_ts: s.duration_ts,
				duration: s.duration,

				bit_rate: s.bit_rate,
				max_bit_rate: s.max_bit_rate,
				nb_frames: s.nb_frames
			})),
			format: {
				name: probeData.format.format_name,
				long_name: probeData.format.format_long_name,
				// size: probeData.format.time, carried at a higher level

				start_time: probeData.format.start_time,
				duration: probeData.format.duration,
				bit_rate: probeData.format.bit_rate,
				max_bit_rate: probeData.format.max_bit_rate
			}
		})

		return newInfo
	}

	async analyzeInterlacing(step: WorkStep): Promise<FieldOrder> {
		const args = [
			// TODO (perf) Low priority process?
			(this.config.paths && this.config.paths.ffmpeg) || process.platform === 'win32'
				? 'ffmpeg.exe'
				: 'ffmpeg',
			'-hide_banner',
			'-filter:v',
			'idet',
			'-frames:v',
			(this.config.interlaced && this.config.interlaced.analyzeTime) || 200,
			'-an',
			'-f',
			'rawvideo',
			'-y',
			process.platform === 'win32' ? 'NUL' : '/dev/null',
			'-i',
			`"${step.input}"`
		]

		const { error: execError, result } = await noTryAsync(
			() =>
				new Promise<string>((resolve, reject) => {
					exec(args.join(' '), (err, stdout, stderr) => {
						this.logger.debug(`Worker: field order detect: output (stdout, stderr)`, stdout, stderr)
						if (err) {
							return reject(err)
						}
						resolve(stderr)
					})
				})
		)
		if (execError) {
			this.logger.error(
				`External process to detect field order for "${step.input}" failed`,
				execError
			)
			return FieldOrder.Unknown
		}
		this.logger.info(`Worker: field order detect: generated field order for "${step.input}"`)

		const fieldRegex = /Multi frame detection: TFF:\s+(\d+)\s+BFF:\s+(\d+)\s+Progressive:\s+(\d+)/
		const res = fieldRegex.exec(result)
		if (res === null) {
			return FieldOrder.Unknown
		}

		const tff = parseInt(res[1])
		const bff = parseInt(res[2])
		const fieldOrder =
			tff <= 10 && bff <= 10 ? FieldOrder.Progressive : tff > bff ? FieldOrder.TFF : FieldOrder.BFF

		return fieldOrder
	}

	analyzeAnomalies(step: WorkStep, duration: number): Promise<Anomalies> {
		const blackDetectRegex = /(black_start:)(\d+(.\d+)?)( black_end:)(\d+(.\d+)?)( black_duration:)(\d+(.\d+))?/g
		const freezeDetectStart = /(lavfi\.freezedetect\.freeze_start: )(\d+(.\d+)?)/g
		const freezeDetectDuration = /(lavfi\.freezedetect\.freeze_duration: )(\d+(.\d+)?)/g
		const freezeDetectEnd = /(lavfi\.freezedetect\.freeze_end: )(\d+(.\d+)?)/g
		const cropDetectReport = /(x1:)(\d+)( x2:)(\d+)( y1):(\d+)( y2:)(\d+)( w:)(\d+)( h:)(\d+)( x:)(\d+)( y:)(\d+)( pts:)(\d+(.\d+)?)( t:)(\d+(.\d+)?)( crop=)(\d+:\d+:\d+:\d+)/g
		const silenceDetectStart = /(silence_start: )((-)?\d+(.\d+)?)/g
		const silenceDetectEnd = /(silence_end: )(\d+(.\d+)?)( \| silence_duration: )(\d+(.\d+)?)/g
		const anomalies: Anomalies = {
			blacks: [],
			freezes: [],
			silences: []
		}
		const cropped: Array<Anomaly> = []

		let vFilterString = ''
		if (this.config.blackFrames) {
			vFilterString +=
				`blackdetect=d=${this.config.blackFrames.blackDuration || '2.0'}:` +
				`pic_th=${this.config.blackFrames.blackRatio || 0.98}:` +
				`pix_th=${this.config.blackFrames.blackThreshold || 0.1}`
		}

		if (this.config.borders) {
			if (vFilterString) {
				vFilterString += ','
			}
			vFilterString +=
				`cropdetect=round=${this.config.borders.round || 8}:` +
				`reset=${this.config.borders.reset || '0'}`
		}

		if (this.config.freezeFrames) {
			if (vFilterString) {
				vFilterString += ','
			}
			vFilterString +=
				`freezedetect=n=${this.config.freezeFrames.freezeNoise || 0.001}:` +
				`d=${this.config.freezeFrames.freezeDuration || '2s'}`
		}

		let aFilterString = ''
		if (this.config.silence) {
			aFilterString += `silencedetect=n=${this.config.silence.noise || '-60dB'}:d=${this.config
				.silence.duration || '2'}` // :m=${this.config.silence.mono || 0}`
		}

		const args = [
			'-hide_banner',
			'-i',
			`"${step.input}"`,
			vFilterString && '-filter:v',
			vFilterString,
			aFilterString && '-filter:a',
			aFilterString,
			'-f',
			'null',
			'-'
		]

		let infoProcess: ChildProcess = spawn(
			(this.config.paths && this.config.paths.ffmpeg) || process.platform === 'win32'
				? 'ffmpeg.exe'
				: 'ffmpeg',
			args,
			{ shell: true }
		)

		let curCrop: Anomaly | undefined = undefined
		infoProcess.stderr.on('data', (data: any) => {
			let stringData = data.toString()
			if (typeof stringData !== 'string') return
			let frameMatch = stringData.match(/^frame= +\d+/)
			if (frameMatch) {
				// currentFrame = Number(frameMatch[0].replace('frame=', ''))
				return
			}

			let res: RegExpExecArray | null

			while ((res = blackDetectRegex.exec(stringData)) !== null) {
				anomalies.blacks!.push(
					literal<Anomaly>({
						start: parseFloat(res[2]),
						duration: parseFloat(res[8]),
						end: parseFloat(res[5])
					})
				)
			}

			while ((res = freezeDetectStart.exec(stringData)) !== null) {
				anomalies.freezes!.push(
					literal<Anomaly>({
						start: parseFloat(res[2]),
						duration: 0.0,
						end: 0.0
					})
				)
			}

			let i = 0
			while ((res = freezeDetectDuration.exec(stringData)) !== null) {
				anomalies.freezes![i++].duration = parseFloat(res[2])
			}

			i = 0
			while ((res = freezeDetectEnd.exec(stringData)) !== null) {
				anomalies.freezes![i++].end = parseFloat(res[2])
			}

			while ((res = cropDetectReport.exec(stringData)) !== null) {
				// just a quick hardcoded thing
				const w = 1920
				const h = 1080

				if (Number(res[10]) !== w || Number(res[12]) !== h) {
					const t = Number(res[21])
					if (curCrop) {
						if (curCrop.end - t > 0.4 || t === duration) {
							// hardcoded 25p
							curCrop.duration = curCrop.end - curCrop.start
							cropped.push(curCrop)
							curCrop = undefined
						} else {
							curCrop.end = t
						}
					}
					if (!curCrop) {
						curCrop = {
							start: t,
							duration: 0.4,
							end: t + 0.4
						}
					}
				}
			}

			while ((res = silenceDetectStart.exec(stringData)) !== null) {
				anomalies.silences!.push(
					literal<Anomaly>({
						start: parseFloat(res[2]),
						duration: 0,
						end: 0
					})
				)
			}

			let s = 0
			while ((res = silenceDetectEnd.exec(stringData)) !== null) {
				anomalies.silences![s].end = parseFloat(res[2])
				anomalies.silences![s++].duration = parseFloat(res[5])
			}
		})

		let resolver: (m: Anomalies) => void
		let rejecter: (err: Error) => void

		const metaPromise = new Promise<Anomalies>((resolve, reject) => {
			resolver = resolve
			rejecter = reject
		})

		infoProcess.on('close', (code) => {
			if (code === 0) {
				// success

				// if freeze frame is the end of video, it is not detected fully
				if (
					anomalies.freezes![anomalies.freezes!.length - 1] &&
					!anomalies.freezes![anomalies.freezes!.length - 1].end
				) {
					anomalies.freezes![anomalies.freezes!.length - 1].end = duration
					anomalies.freezes![anomalies.freezes!.length - 1].duration =
						duration - anomalies.freezes![anomalies.freezes!.length - 1].start
				}
				// if silence is the end of video, it is not detected fully
				if (
					anomalies.silences![anomalies.silences!.length - 1] &&
					!anomalies.silences![anomalies.silences!.length - 1].end
				) {
					anomalies.silences![anomalies.silences!.length - 1].end = duration
					anomalies.silences![anomalies.silences!.length - 1].duration =
						duration - anomalies.silences![anomalies.silences!.length - 1].start
				}

				this.logger.debug(
					`Worker: get anomalies: completed metadata analysis: freezes ${
						anomalies.freezes!.length
					}, blacks ${anomalies.blacks!.length}`
				)

				// end crop
				if (curCrop) {
					curCrop.duration = curCrop.end - curCrop.start
					cropped.push(curCrop)
				}

				anomalies.borders = cropped
				resolver(anomalies)
			} else {
				this.logger.error(`Worker: get anomalies: FFmpeg failed with code ${code}`)
				rejecter(new Error(`Worker: get anomalies: FFmpeg failed with code ${code}`))
			}
		})

		return metaPromise
	}

	async analyzeBlackFrames(step: WorkStep): Promise<Array<Anomaly>> {
		return []
	}

	async analyzeFreezes(step: WorkStep): Promise<Array<Anomaly>> {
		return []
	}

	async analyzeBorders(step: WorkStep): Promise<Array<Anomaly>> {
		return []
	}

	async analyzeSilence(step: WorkStep): Promise<Array<Anomaly>> {
		return []
	}

	async analyzeLoudness(step: WorkStep): Promise<LoudnessInfo | null> {
		const args = [
			(this.config.paths && this.config.paths.ffmpeg) || process.platform === 'win32'
				? 'ffmpeg.exe'
				: 'ffmpeg',
			'-hide_banner',
			'-i',
			`"${step.input}"`,
			'-filter:a',
			'loudnorm=print_format=json',
			'-vn',
			'-f',
			'null',
			'-threads',
			'1',
			'-'
		]

		const { result: probeData, error: execError } = await noTryAsync(
			() =>
				new Promise<any>((resolve, reject) => {
					exec(args.join(' '), (err, stdout, stderr) => {
						this.logger.debug(`Worker: metadata generate: output (stdout, stderr)`, stdout, stderr)
						if (err) {
							return reject(err)
						}

						const lines = stderr.split(process.platform === 'win32' ? '\r\n' : '\n')
						const s = lines.splice(-13, 12).join('\n')
						const json: any = JSON.parse(s)
						resolve(json)
					})
				})
		)

		if (execError) {
			step.failStep(`External process to generate loudness info failed`, execError)
			return null
		}

		this.logger.info(`Worker: loudness info generate: generated loudness info for "${step.input}"`)
		this.logger.debug(`Worker: loudness info generate: generated loudness info details`, probeData)

		const loudness: LoudnessInfo = {
			integrated: Number(probeData.input_i),
			LRA: Number(probeData.input_lra),
			truePeak: Number(probeData.input_tp),
			threshold: Number(probeData.input_thresh)
		}

		return loudness
	}
}
