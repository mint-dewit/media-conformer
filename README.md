# media-conformer

This project aims to make ffmpeg transcoding a drag and drop operation accessible by anyone, using presets built by with expert knowledge.

![Media Conformer](https://raw.githubusercontent.com/baltedewit/media-conformer/master/images/media-conformer.png)

The following goals outline the project:

- Drag and drop interface
- Portable preset files
- Batch processing
- Automated 2 pass loudness processing
- Gracefully handle interlaced conversion:
  - interlaced to progressive
  - progressive to interlaced
  - field conversion (tff to bff and vice versa)

## Acknowledgements

- The ffmpeg project for making an amazing A/V tool free and open source.
- Large bits around media processing were taken from nrkno/tv-automation-media-management
- This project was generated using the vue-cli and vue electron cli plugin

## Project setup

```
yarn install
```

Note: FFmpeg and FFprobe need to be in the PATH environment variable or you need to set a custom path in the application settings.

### Compiles and hot-reloads for development

```
yarn electron:serve
```

### Compiles and minifies for production

```
yarn electron:build
```

### Lints and fixes files

```
yarn lint
```

## Preset files

### Example file

```jsonc
{
	// Name of the preset to be shown in the settings:
	"name": "Example Config",

	// Analysis configuration
	"blackFrames": {},
	"freezeFrames": {},
	"borders": {},
	"silence": {},
	"interlaced": {},
	"loudness": true,

	// Per file, each encoder will spawn an ffmpeg process
	"encoders": [
		{
			"postFix": "_YOUTUBE",
			"audioEncoder": {},
			"loudness": {
				"integrated": -14
			}
		},
		{
			"postFix": "_TV",
			"audioEncoder": {},
			"loudness": {
				"integrated": -23
			},
			"videoEncoder": {},
			"format": {
				// having a format defined implies a reencode will be done
				"width": 1024
			}
		},
		{
			"postFix": "_NO-AUDIO",
			"discard": {
				"audio": true
			}
		}
	]
}
```

### All options

Note how a lot of times you can define an empty object, e.g. for the black frame analysis. Defining an empty object implies the ffmpeg defaults will be used.

```ts
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

export interface EncoderConfig {
	/** postfix to add to the filename */
	postFix: string
	/** extension of the new file (e.g. .mp4) */
	extension?: string
	/** custom options. Ignores all other options */
	custom?: string
	/** discard streams */
	discard?: {
		video?: boolean
		audio?: boolean
		subtitle?: boolean
		data?: boolean
	}
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
```

#### Custom encoder

The custom encoder enables the use of complex ffmpeg encoding/filter settings. It is assumed you know how to use ffmpeg when using the custom encoder.

It takes in a string of ffmpeg args and the output file path, name and extension are automatically appended.

```json
"encoders": [
	{
		"postFix": "_custom-text-overlay",
		"extension": ".mp4",
		"custom": "-vf drawtext=\"fontfile=/Windows/Fonts/arial.ttf: text='Custom text overlay': fontcolor=white: fontsize=120: box=1: boxcolor=black: boxborderw=20: x=(w-text_w)/2: y=(h-text_h)/1.4\""
	}
]
```

The custom encoder supports handlebar style string replacement for customising file names. If any handlebars are detected the output filename will not be automatically appended. You will need to handle the output file yourself (e.g. `{{dir}}/{{name}}{{postFix}}_Custom-format{{extension}}`).

```json
"encoders": [
	{
		"postFix": "_Complex-Filter",
		"custom": "-an -filter_complex \"[0]pad=iw*2:ih[int];[int][0]overlay=W/2:0[doublewidth];[doublewidth]scale=iw/2:ih/2[scaled];[scaled]split=3[s1][s2][s3];[s1]crop=iw/3:ih:0:0[one];[s2]crop=iw/3:ih:ow:0[two];[s3]crop=iw/3:ih:ow*2:0[three]\" -map \"[one]\" -q:v 1 -sws_flags bicubic \"{{dir}}/{{name}}{{postFix}}_{{date}}_one{{ext}}\" -map \"[two]\" -q:v 1 -sws_flags bicubic \"{{dir}}/{{name}}{{postFix}}_{{date}}_two{{ext}}\" -map \"[three]\" -q:v 1 -sws_flags bicubic \"{{dir}}/{{name}}{{postFix}}_{{date}}_three{{ext}}\""
	}
]
```

Available to use:

```ts
postFix     // EncoderConfig postfix
extension?  // EncoderConfig extension
root        // Input file root name
dir         // Input file directory
base        // Input file name with original extension
ext         // Input file extension
name        // Input file name
date        // Date in ISO format (YYYY-MM-DD)
```

# Contributors:
	- JonFranklin301
