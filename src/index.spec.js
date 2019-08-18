import fs from 'fs';
import path from 'path';

import { transformAsync } from '@babel/core';

import plugin from '.';

jest.mock('fs');

const options = {
	plugins:    [plugin],
	configFile: false,
	babelrc:    false,
};

const relativePath = (filePath) => path.relative(process.cwd(), filePath);

let files = {};

beforeEach(() => {
	fs.existsSync.mockImplementation(
		(filePath) => Object.prototype.hasOwnProperty.call(files, relativePath(filePath))
	);
	fs.readFileSync.mockImplementation((filePath, { encoding }) => Object.prototype.hasOwnProperty.call(files, relativePath(filePath)) && encoding === 'utf8' && files[relativePath(filePath)]);
});

afterEach(() => {
	files = {};

	jest.resetAllMocks();
});

it('name=babel-plugin-universal-dotenv', () => expect(plugin({ types: {} }).name).toStrictEqual('babel-plugin-universal-dotenv'));

it('ignores empty code', async () => expect(await transformAsync('', options)).toHaveProperty('code', ''));

it('ignores unknown environment variables', async () => expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY;'));

it('expands environment variables', async () => {
	process.env.TEST = 'TESTVALUE';

	files = { '.env': 'KEY=$TEST' };

	expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY || "TESTVALUE";');
});

it('expands curly brace environment variables', async () => {
	process.env.TEST = 'OTHERTESTVALUE';

	files = { '.env': 'KEY=${TEST}' }; // eslint-disable-line no-template-curly-in-string

	expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY || "OTHERTESTVALUE";');
});

it('recursively expands environment variables', async () => {
	files = { '.env': 'KEY=VALUE\nOTHERKEY=$KEY/value' };

	expect(await transformAsync('process.env.OTHERKEY;', options)).toHaveProperty('code', 'process.env.OTHERKEY || "VALUE/value";');
});

it('doesn\'t mutate process.env', async () => {
	process.env.KEY = 'AVALUE';
	process.env.KEY2 = 'BVALUE';

	files = { '.env': 'KEY=ANOTHERVALUE\nKEY3=CVALUE' };

	expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY || "ANOTHERVALUE";');

	expect(process.env.KEY).toStrictEqual('AVALUE');
	expect(process.env.KEY2).toStrictEqual('BVALUE');
	expect(process.env.KEY3).toBeUndefined();
});

it('ignores other objects', async () => expect(await transformAsync('obj.NODE_ENV;', options)).toHaveProperty('code', 'obj.NODE_ENV;'));

['development', '', 'nonsense'].forEach((NODE_ENV) => {
	describe(`NODE_ENV=${NODE_ENV}`, () => {
		beforeAll(() => {
			process.env.NODE_ENV = NODE_ENV;
		});

		it('inlines NODE_ENV=development', async () => expect(await transformAsync('process.env.NODE_ENV;', options)).toHaveProperty('code', '"development";'));

		it('.env', async () => {
			files = { '.env': 'KEY=VALUE' };

			expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY || "VALUE";');
		});

		it('.env.local', async () => {
			files = { '.env.local': 'KEY=VALUE' };

			expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY || "VALUE";');
		});

		it('.env.development', async () => {
			files = { '.env.development': 'KEY=VALUE' };

			expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY || "VALUE";');
		});

		it('.env.development.local', async () => {
			files = { '.env.development.local': 'KEY=VALUE' };

			expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY || "VALUE";');
		});

		it('not .env.production', async () => {
			files = { '.env.production': 'KEY=VALUE' };

			expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY;');
		});

		it('not .env.production.local', async () => {
			files = { '.env.production.local': 'KEY=VALUE' };

			expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY;');
		});

		it('not .env.test', async () => {
			files = { '.env.test': 'KEY=VALUE' };

			expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY;');
		});

		it('not .env.test.local', async () => {
			files = { '.env.test.local': 'KEY=VALUE' };

			expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY;');
		});

		it('prioritizes by specificity', async () => {
			files = {
				'.env':                   'KEY1=VALUE1\nKEY2=VALUE1\nKEY3=VALUE1\nKEY4=VALUE1',
				'.env.local':             'KEY1=VALUE2\nKEY2=VALUE2\nKEY3=VALUE2',
				'.env.development':       'KEY1=VALUE3\nKEY2=VALUE3',
				'.env.development.local': 'KEY1=VALUE4',
			};

			expect(await transformAsync('process.env.KEY1;', options)).toHaveProperty('code', 'process.env.KEY1 || "VALUE4";');
			expect(await transformAsync('process.env.KEY2;', options)).toHaveProperty('code', 'process.env.KEY2 || "VALUE3";');
			expect(await transformAsync('process.env.KEY3;', options)).toHaveProperty('code', 'process.env.KEY3 || "VALUE2";');
			expect(await transformAsync('process.env.KEY4;', options)).toHaveProperty('code', 'process.env.KEY4 || "VALUE1";');
		});
	});
});

describe('NODE_ENV=production', () => {
	beforeAll(() => {
		process.env.NODE_ENV = 'production';
	});

	it('inlines NODE_ENV=production', async () => expect(await transformAsync('process.env.NODE_ENV;', options)).toHaveProperty('code', '"production";'));

	it('.env', async () => {
		files = { '.env': 'KEY=VALUE' };

		expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY || "VALUE";');
	});

	it('.env.local', async () => {
		files = { '.env.local': 'KEY=VALUE' };

		expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY || "VALUE";');
	});

	it('.env.production', async () => {
		files = { '.env.production': 'KEY=VALUE' };

		expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY || "VALUE";');
	});

	it('.env.production.local', async () => {
		files = { '.env.production.local': 'KEY=VALUE' };

		expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY || "VALUE";');
	});

	it('not .env.development', async () => {
		files = { '.env.development': 'KEY=VALUE' };

		expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY;');
	});

	it('not .env.development.local', async () => {
		files = { '.env.development.local': 'KEY=VALUE' };

		expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY;');
	});

	it('not .env.test', async () => {
		files = { '.env.test': 'KEY=VALUE' };

		expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY;');
	});

	it('not .env.test.local', async () => {
		files = { '.env.test.local': 'KEY=VALUE' };

		expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY;');
	});

	it('prioritizes by specificity', async () => {
		files = {
			'.env':                  'KEY1=VALUE1\nKEY2=VALUE1\nKEY3=VALUE1\nKEY4=VALUE1',
			'.env.local':            'KEY1=VALUE2\nKEY2=VALUE2\nKEY3=VALUE2',
			'.env.production':       'KEY1=VALUE3\nKEY2=VALUE3',
			'.env.production.local': 'KEY1=VALUE4',
		};

		expect(await transformAsync('process.env.KEY1;', options)).toHaveProperty('code', 'process.env.KEY1 || "VALUE4";');
		expect(await transformAsync('process.env.KEY2;', options)).toHaveProperty('code', 'process.env.KEY2 || "VALUE3";');
		expect(await transformAsync('process.env.KEY3;', options)).toHaveProperty('code', 'process.env.KEY3 || "VALUE2";');
		expect(await transformAsync('process.env.KEY4;', options)).toHaveProperty('code', 'process.env.KEY4 || "VALUE1";');
	});
});

describe('NODE_ENV=test', () => {
	beforeAll(() => {
		process.env.NODE_ENV = 'test';
	});

	it('inlines NODE_ENV=test', async () => expect(await transformAsync('process.env.NODE_ENV;', options)).toHaveProperty('code', '"test";'));

	it('.env', async () => {
		files = { '.env': 'KEY=VALUE' };

		expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY || "VALUE";');
	});

	it('.env.test', async () => {
		files = { '.env.test': 'KEY=VALUE' };

		expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY || "VALUE";');
	});

	it('.env.test.local', async () => {
		files = { '.env.test.local': 'KEY=VALUE' };

		expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY || "VALUE";');
	});

	it('not .env.local', async () => {
		files = { '.env.local': 'KEY=VALUE' };

		expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY;');
	});

	it('not .env.development', async () => {
		files = { '.env.development': 'KEY=VALUE' };

		expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY;');
	});

	it('not .env.development.local', async () => {
		files = { '.env.development.local': 'KEY=VALUE' };

		expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY;');
	});

	it('not .env.production', async () => {
		files = { '.env.production': 'KEY=VALUE' };

		expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY;');
	});

	it('not .env.production.local', async () => {
		files = { '.env.production.local': 'KEY=VALUE' };

		expect(await transformAsync('process.env.KEY;', options)).toHaveProperty('code', 'process.env.KEY;');
	});

	it('prioritizes by specificity', async () => {
		files = {
			'.env':            'KEY1=VALUE1\nKEY2=VALUE1\nKEY3=VALUE1',
			'.env.test':       'KEY1=VALUE3\nKEY2=VALUE3',
			'.env.test.local': 'KEY1=VALUE4',
		};

		expect(await transformAsync('process.env.KEY1;', options)).toHaveProperty('code', 'process.env.KEY1 || "VALUE4";');
		expect(await transformAsync('process.env.KEY2;', options)).toHaveProperty('code', 'process.env.KEY2 || "VALUE3";');
		expect(await transformAsync('process.env.KEY3;', options)).toHaveProperty('code', 'process.env.KEY3 || "VALUE1";');
	});
});
