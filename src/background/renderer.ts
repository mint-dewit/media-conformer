import { EventEmitter } from 'events'
import { spawn, ChildProcess } from 'child_process'
import { Config } from '@/types/config'
import { RenderWorkstep } from './workStep'
import { FieldOrder } from '@/types/mediaInfo'

export class Renderer extends EventEmitter {
	config: Config

	constructor(config: Config) {
		super()

		this.config = config
	}

	async renderFile(step: RenderWorkstep) {
		console.log('Rendering ' + step.input + ' to ' + step.output)

		step.renderProgress(0) // inform front end of existence

		const args = this._getProcessArgs(step)
		console.log(args)

		// frame=  439 fps= 26 q=-1.0 Lsize=   18008kB time=00:00:17.44 bitrate=8458.8kbits/s speed=1.02x
		// frame=  240 fps=0.0 q=-1.0 size=    3584kB time=00:00:09.48 bitrate=3097.1kbits/s speed=18.9x
		const progressReportRegex = /(frame=\s*)(\d+)(\s*fps=\s*)(\d+(.\d+)?)(\s*q=)(-?(\d+.?)+)(\s*(L)?size=\s*)(\d+(kB|mB|b))(\s*time=\s*)(\d{2}:\d{2}:\d{2}.\d{2})(\s*bitrate=\s*)(\d+(.\d+)?(\w+(\/s)?)(\s*speed=)(\d+.\d+x))/g
		const timeRegex = /(\d{2}):(\d{2}):(\d{2}.\d{2})/

		let renderProcess: ChildProcess = spawn(
			(this.config.paths && this.config.paths.ffmpeg) || process.platform === 'win32'
				? 'ffmpeg.exe'
				: 'ffmpeg',
			args,
			{ shell: true }
		)

		const fileDuration = step.analysis.info.format && step.analysis.info.format.duration
		if (fileDuration) {
			renderProcess.stderr.on('data', (data: any) => {
				let stringData = data.toString()
				// console.log(stringData)
				let res: RegExpExecArray | null
				while ((res = progressReportRegex.exec(stringData)) !== null) {
					// console.log(step.output, res[14])
					const time = timeRegex.exec(res[14])
					if (time) {
						const t = Number(time[1]) * 3600 + Number(time[2]) * 60 + Number(time[3])
						step.renderProgress(t / Number(fileDuration))
					}
				}
			})
		}

		let resolver: () => void
		let rejecter: (err: Error) => void

		const metaPromise = new Promise<void>((resolve, reject) => {
			resolver = resolve
			rejecter = reject
		})

		renderProcess.on('close', (code) => {
			if (code === 0) {
				resolver()
			} else {
				rejecter(new Error(`Worker: renderer (${step.output}): FFmpeg failed with code ${code}`))
			}
		})

		return metaPromise
	}

	private _getProcessArgs(step: RenderWorkstep) {
		const args = ['-y', '-i', step.input]

		if (step.encoderConfig.videoEncoder) {
			const videoConfig = step.encoderConfig.videoEncoder

			args.push('-codec:v', videoConfig.encoder || 'libx264')

			if (videoConfig.encoderOptions) args.push(...videoConfig.encoderOptions)
			else args.push('-crf', '18')

			let videoFilter: Array<string> = []
			const inputFieldOrder = step.analysis.info.field_order

			if (step.encoderConfig.format) {
				const f = step.encoderConfig.format
				if (f.width || f.height) {
					videoFilter.push(`scale=w=${f.width || '-1'}:h=${f.height || -1}`)
				}
				if (inputFieldOrder !== FieldOrder.Progressive && f.interlaced === undefined) {
					// input is interlaced, output is progressive

					// export 1 frame per frame or 1 frame per field:
					const mode = (f.frameRate || 25) >= 50 ? 1 : 0
					// if we know fieldorder instruct filter, otherwise autodetect:
					const parity =
						inputFieldOrder === FieldOrder.BFF ? 1 : inputFieldOrder === FieldOrder.TFF ? 0 : -1
					// if we know fieldorder always deinterlace, otherwise autodetect:
					const deint = inputFieldOrder && inputFieldOrder !== FieldOrder.Unknown ? 0 : -1

					videoFilter.push(`bwdif=mode=${mode}:parity=${parity}:deint=${deint}`)
				}
				if (f.interlaced) {
					// output is interlaced
					if (inputFieldOrder) {
						// input has metadata
						if (inputFieldOrder !== (f.interlaced as unknown)) {
							// input !== output
							if (inputFieldOrder === FieldOrder.Progressive) {
								// input is progressive
								const modes: { [key: string]: string } = {
									[FieldOrder.TFF]: 'interleave_top',
									[FieldOrder.BFF]: 'interleave_bottom'
								}
								const mode = modes[f.interlaced] as string

								videoFilter.push('fps=' + (f.frameRate || 25) * 2) // make sure input has appropriate amount of frames
								videoFilter.push('tinterlace=mode=' + mode)
							}
						}
					} else {
						// TODO - is there a ffmpeg filter that can interlace based on decoder field metadata?
					}

					// set fieldorder (this will correctly set tff/bff)
					videoFilter.push(`fieldorder=${f.interlaced}`)
				} else if (f.frameRate) {
					videoFilter.push(`${videoFilter && ','}fps=${f.frameRate || '25'}`)
				}
				if (f.colorspace) {
					videoFilter.push(`${videoFilter && ','}colorspace=${f.colorspace}`)
				} else if (f.height) {
					const cSpace = f.height >= 720 ? 'bt601-6-625' : 'bt709'
					videoFilter.push(`${videoFilter && ','}colorspace=${cSpace}`)
				}
			}

			if (videoFilter.length) args.push('-filter:v', videoFilter.join(','))
		} else {
			args.push('-codec:v', 'copy')
		}

		if (step.encoderConfig.audioEncoder) {
			const audioConfig = step.encoderConfig.audioEncoder

			args.push('-codec:a', audioConfig.encoder || 'aac')

			if (audioConfig.encoderOptions) args.push(...audioConfig.encoderOptions)

			let audioFilter = ''

			if (step.encoderConfig.loudness) {
				let measured = ''
				if (step.analysis.info.loudness) {
					// pass in measure values
					const loudness = step.analysis.info.loudness
					measured =
						`measured_i=${loudness.integrated}:` +
						`measured_lra=${loudness.LRA}:` +
						`measured_tp=${loudness.truePeak}:` +
						`measured_thresh=${loudness.truePeak}:`
				}
				const lConfig = step.encoderConfig.loudness
				audioFilter += `loudnorm=${measured}i=${lConfig.integrated || -23}:lra=${lConfig.LRA ||
					13}:tp=${lConfig.truePeak || -1}:dual_mono=${lConfig.dualMono || 'false'}`
			}

			if (audioFilter) args.push('-filter:a', audioFilter)

			if (step.encoderConfig.format && step.encoderConfig.format.audioRate) {
				args.push('-ar', step.encoderConfig.format.audioRate)
			} else if (step.encoderConfig.loudness) {
				args.push('-ar', '48k')
			}
		} else {
			args.push('-codec:a', 'copy')
		}

		if (step.encoderConfig.format && step.encoderConfig.format.format) {
			args.push('-f', step.encoderConfig.format.format)
		}

		// pass the interlacing flags
		if (
			step.encoderConfig.videoEncoder &&
			step.encoderConfig.format &&
			step.encoderConfig.format.interlaced
		) {
			args.push('-flags', '+ildct+ilme')
		}

		args.push(step.output)

		return args
	}
}
