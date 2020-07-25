import { Analysis } from './mediaInfo'

export interface ProgressReport {
	path: string
	progress: number
	type: 'analysis' | 'renderer'
}

export interface AnalysisResult {
	path: string
	analysis: Analysis
}
export interface RenderingResult {
	path: string
	outputs: Array<string>
}
