module.exports = {
	ignore: [
		'**/*.spec.js',
		'**/*.test.js',
	],
	presets: [
		[
			'@babel/preset-env',
			{
				targets: {
					node: 'current',
				},
				ignoreBrowserslistConfig: true,
			},
		],
	],
};
