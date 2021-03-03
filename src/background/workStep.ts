import { EventEmitter } from 'events'
import { EncoderConfig } from '@/types/config'
import { Analysis } from '@/types/mediaInfo'
import { ParsedPath } from 'path'

export class WorkStep extends EventEmitter {
	input: string
	failed = false
	warnings: Array<string> = []

	progressSteps = 0
	stepsCompleted = 0

	constructor(input: string) {
		super()
		this.input = input
	}

	failStep(reason?: string, cause?: Error) {
		this.failed = true
		if (reason) {
			this.warnings.push(reason)
		} else {
			this.warnings.push('Failed for unknown reason')
		}
	}

	addWarning(reason: string) {
		this.warnings.push(reason)
	}

	completed(steps = 1) {
		this.stepsCompleted += steps

		this.emit('progressReport', {
			progress: this.stepsCompleted / this.progressSteps,
			path: this.input
		})
	}
}

export class RenderWorkstep extends WorkStep {
	output: string
	outputParse: ParsedPath
	encoderConfig: EncoderConfig
	analysis: Analysis

	constructor(
		input: string,
		output: string,
		outputParse: ParsedPath,
		config: EncoderConfig,
		analysis: Analysis
	) {
		super(input)
		this.input = input
		this.output = output
		this.outputParse = outputParse
		this.encoderConfig = config
		this.analysis = analysis
	}

	renderProgress(p: number) {
		this.emit('progressReport', {
			progress: p,
			path: this.output
		})
	}
}
