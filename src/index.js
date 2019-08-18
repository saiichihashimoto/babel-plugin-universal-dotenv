import { name } from '../package';

import expand from './expand';

const allowedEnvs = ['development', 'test', 'production'];

export default function universalDotenv({ types: { valueToNode, logicalExpression, identifier } }) {
	return {
		name,
		pre() {
			this.NODE_ENV = allowedEnvs.includes(process.env.NODE_ENV) ? process.env.NODE_ENV : 'development';

			this.values = expand(this.NODE_ENV);
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

export {
	expand,
};
