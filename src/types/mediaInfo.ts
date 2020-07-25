export enum MediaStreamType {
	Audio = 'audio',
	Video = 'video'
}

export interface MediaStreamCodec {
	type?: MediaStreamType
	long_name?: string
	time_base?: string
	tag_string?: string
	is_avc?: string
}

export interface MediaStream {
	codec: MediaStreamCodec

	// video
	width?: number
	height?: number
	sample_aspect_ratio?: string
	display_aspect_ratio?: string
	pix_fmt?: string
	bits_per_raw_sample?: string

	// audio
	sample_fmt?: string
	sample_rate?: string
	channels?: number
	channel_layout?: string
	bits_per_sample?: number

	// common
	time_base?: string
	start_time?: string
	duration_ts?: number
	duration?: string

	bit_rate?: string
	max_bit_rate?: string
	nb_frames?: string
}

export interface MediaFormat {
	name?: string
	long_name?: string
	start_time?: string
	duration?: number
	bit_rate?: number
	max_bit_rate?: number
}

export enum FieldOrder {
	Unknown = 'unknown',
	Progressive = 'progressive',
	TFF = 'tff',
	BFF = 'bff'
}

export interface LoudnessInfo {
	integrated: number
	truePeak: number
	LRA: number
	threshold: number
}

export interface Anomalies {
	blacks?: Array<Anomaly>
	freezes?: Array<Anomaly>
	silences?: Array<Anomaly>
	borders?: Array<Anomaly>
}

export interface MediaInfo {
	name: string
	field_order?: FieldOrder
	streams?: MediaStream[]
	format?: MediaFormat
	timebase?: number
	loudness?: LoudnessInfo
}

export interface Analysis {
	info: MediaInfo
	anomalies: Anomalies
}

export interface Anomaly {
	start: number
	duration: number
	end: number
}
