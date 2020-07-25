// vue.config.js
module.exports = {
	pluginOptions: {
		electronBuilder: {
			mainProcessWatch: ['src/background/**.ts']
		}
	}
}
