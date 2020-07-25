import { Config } from '@/types/config'

// TODO - make editable and shippable somehow

export const config: Config = {
	name: '',
	blackFrames: {},
	// freezeFrames: {}, // can't use this in ubuntu 18.04 because of outdated ffmpeg
	borders: {},
	silence: {},
	interlaced: {},
	loudness: true,

	encoders: [
		{
			postFix: '_YOUTUBE',
			audioEncoder: {},
			loudness: {
				integrated: -14
			},
			videoEncoder: {}
		},
		{
			postFix: '_TV',
			audioEncoder: {},
			loudness: {
				integrated: -23
			},
			videoEncoder: {},
			format: {
				width: 1024
			}
		}
	]
}
