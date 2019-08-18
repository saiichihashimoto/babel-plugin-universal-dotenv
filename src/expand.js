/* istanbul ignore file */
/* eslint-disable require-unicode-regexp */
import fs from 'fs';
import path from 'path';

import { parse } from 'dotenv';

// Modified dotenv-expand https://github.com/motdotla/dotenv-expand/blob/f315d40d05ef42031bbda4539c80e6d88c54253c/lib/main.js

function interpolate(value, parsed) {
	return (value.match(/\$(\w+)|\${(\w+)}/g) || [])
		.reduce((acc, match) => {
			const key = match.replace(/\$|{|}/g, '');

			return acc.replace(match, interpolate(parsed[key] || process.env[key] || ''));
		}, value);
}

export default function expand(NODE_ENV) {
	const dotenvPath = path.resolve(process.cwd(), '.env');

	return [
		dotenvPath,
		NODE_ENV !== 'test' && `${dotenvPath}.local`,
		`${dotenvPath}.${NODE_ENV}`,
		`${dotenvPath}.${NODE_ENV}.local`,
	]
		.filter(Boolean)
		.filter(fs.existsSync)
		.map((filePath) => parse(fs.readFileSync(filePath, { encoding: 'utf8' })))
		.map((parsed) => Object.entries(parsed).reduce(
			(acc, [key, val]) => {
				const value = val || process.env[key] || '';

				if (val.substring(0, 2) === '\\$') {
					acc[key] = value.substring(1);
				} else if (val.indexOf('\\$') > 0) {
					acc[key] = value.replace(/\\\$/g, '$');
				} else {
					acc[key] = interpolate(value, parsed);
				}

				return acc;
			},
			{}
		))
		.reduce((acc, result) => ({
			...acc,
			...result,
		}), {});
}
