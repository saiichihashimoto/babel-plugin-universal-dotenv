module.exports = function(config) {
	config.set({
		mutator:          'javascript',
		packageManager:   'npm',
		reporters:        ['clear-text', 'progress', 'dashboard'],
		testRunner:       'jest',
		transpilers:      ['babel'],
		coverageAnalysis: 'off',
	});
};
