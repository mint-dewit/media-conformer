// vue.config.js
module.exports = {
	pluginOptions: {
		electronBuilder: {
			mainProcessWatch: ['src/background/**.ts'],
			builderOptions: {
				win: {
					target: 'portable',
					icon: './public/icon.png'
				}
			}
		}
	}
}
