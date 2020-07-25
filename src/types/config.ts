import { FieldOrder as FO } from './mediaInfo'

export enum FieldOrder {
	TFF = FO.TFF,
	BFF = FO.BFF
}

export interface EncoderConfig {
	/** postfix to add to the filename */
	postFix: string
	/** extension of the new file (e.g. .mp4) */
	extension?: string
	/** Configures loudnorm filter */
	loudness?: {
		integrated?: number
		truePeak?: number
		LRA?: number
		dualMono?: boolean
	}
	/** inserts scaler, rate conversion, interlacing/deinterlacing */
	format?: {
		width?: number
		height?: number
		frameRate?: number
		audioRate?: string
		interlaced?: FieldOrder // possible values: tff or bff
		format?: string // ffmpeg -f option
		colorspace?: string
	}
	/** sets up the video encoder({} for default libx264, omit for copy) */
	videoEncoder?: {
		encoder?: string
		encoderOptions?: Array<string>
	}
	/** sets up the audio encoder ({} for default aac, omit for copy) */
	audioEncoder?: {
		encoder?: string
		encoderOptions?: Array<string>
	}
}

export interface Preset {
	name: string

	/** blackdetect filter */
	blackFrames?: {
		blackDuration?: number
		blackRatio?: number
		blackThreshold?: number
	}
	/** freezedetect filter (requires recent ffmpeg) */
	freezeFrames?: {
		freezeNoise?: number
		freezeDuration?: number
	}
	/** cropdetect filter */
	borders?: {
		threshold?: number
		round?: number
		reset?: number
	}
	/** advanced interlace detection */
	interlaced?: {
		analyzeTime?: number
	}
	/** generate warnings for silence */
	silence?: {
		noise?: string
		duration?: string
	}
	/** enables 2-pass loudness correction */
	loudness?: boolean

	encoders: Array<EncoderConfig>
}

export interface Config extends Preset {
	paths?: {
		ffmpeg?: string
		ffprobe?: string
	}
}
