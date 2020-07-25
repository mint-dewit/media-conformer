module.exports = {
	root: true,
	env: {
		node: true
	},
	extends: [
		'plugin:vue/base',
		'plugin:vue/essential',
		'eslint:recommended',
		'@vue/typescript/recommended',
		'@vue/prettier',
		'@vue/prettier/@typescript-eslint'
	],
	parserOptions: {
		ecmaVersion: 2020
	},
	rules: {
		'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
		'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
		'no-use-before-define': 'off',
		'@typescript-eslint/no-use-before-define': 'off'
	},
	overrides: [
		{
			files: ['background.ts', 'background/**.ts'],
			parser: '@typescript-eslint/parser',
			parserOptions: { project: './tsconfig.json' },
			plugins: ['@typescript-eslint'],
			extends: [
				'eslint:recommended',
				'plugin:@typescript-eslint/eslint-recommended',
				'plugin:@typescript-eslint/recommended',
				'prettier/@typescript-eslint'
			],
			rules: {}
		}
	]
}
