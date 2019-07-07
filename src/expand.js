/* istanbul ignore file */
// Modified dotenv-expand https://github.com/motdotla/dotenv-expand/blob/f315d40d05ef42031bbda4539c80e6d88c54253c/lib/main.js

export default function dotenvExpand(parsed) {
	const interpolate = (env) => {
		const matches = env.match(/\$(\w+)|\${(\w+)}/g) || [];

		return matches.reduce((acc, match) => {
			const key = match.replace(/\$|{|}/g, '');

			return acc.replace(match, interpolate(parsed[key] || process.env[key] || ''));
		}, env);
	};

	return Object.entries(parsed).reduce(
		(acc, [key, val]) => {
			const value = val || process.env[key] || '';

			if (val.substring(0, 2) === '\\$') {
				acc[key] = value.substring(1);
			} else if (val.indexOf('\\$') > 0) {
				acc[key] = value.replace(/\\\$/g, '$');
			} else {
				acc[key] = interpolate(value);
			}

			return acc;
		},
		{},
	);
}
