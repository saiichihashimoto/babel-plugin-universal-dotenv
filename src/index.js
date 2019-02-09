import fs from 'fs';
import path from 'path';
import { parse } from 'dotenv';
import { name } from '../package';
import expand from './expand';

const dotenvPath = path.resolve(process.cwd(), '.env');
const allowedEnvs = ['development', 'test', 'production'];

export default function universalDotenv({ types: { valueToNode, logicalExpression, identifier } }) {
	return {
		name,
		pre() {
			this.NODE_ENV = allowedEnvs.includes(process.env.NODE_ENV) ? process.env.NODE_ENV : 'development';

			const before = { ...process.env };
			this.values = [
				`${dotenvPath}.${this.NODE_ENV}.local`,
				`${dotenvPath}.${this.NODE_ENV}`,
				this.NODE_ENV !== 'test' && `${dotenvPath}.local`,
				dotenvPath,
			]
				.filter(Boolean)
				.filter(fs.existsSync)
				.reduce((values, file) => ({
					...expand(parse(fs.readFileSync(file, { encoding: 'utf8' }))),
					...values,
				}), {});
			process.env = before;
		},
		visitor: {
			MemberExpression(node) {
				if (!node.get('object').matchesPattern('process.env')) {
					return;
				}
				const { value: key } = node.toComputedKey();
				if (key === 'NODE_ENV') {
					node.replaceWith(valueToNode(this.NODE_ENV));
				} else if (Object.prototype.hasOwnProperty.call(this.values, key)) {
					node.replaceWith(logicalExpression('||', identifier(`process.env.${key}`), valueToNode(this.values[key])));
				}
			},
		},
	};
}
