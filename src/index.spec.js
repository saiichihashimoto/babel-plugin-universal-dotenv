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

describe('babel-plugin-universal-dotenv', () => {
	let files = {};

	beforeEach(() => {
		fs.existsSync.mockImplementation((filePath) => (
			Object.prototype.hasOwnProperty.call(files, relativePath(filePath))
		));
		fs.readFileSync.mockImplementation((filePath, { encoding }) => (
			Object.prototype.hasOwnProperty.call(files, relativePath(filePath)) && encoding === 'utf8' && files[relativePath(filePath)]
		));
	});

	afterEach(() => {
		files = {};

		jest.resetAllMocks();
	});

	it('name=babel-plugin-universal-dotenv', () => expect(plugin({ types: {} }).name).toEqual('babel-plugin-universal-dotenv'));

	it('ignores empty code', () => expect(transformAsync('', options)).resolves.toHaveProperty('code', ''));

	it('ignores unknown environment variables', () => expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY;'));

	it('expands environment variables', () => {
		process.env.TEST = 'TESTVALUE';

		files = { '.env': 'KEY=$TEST' };

		return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY || "TESTVALUE";');
	});

	it('expands curly brace environment variables', () => {
		process.env.TEST = 'OTHERTESTVALUE';

		files = { '.env': 'KEY=${TEST}' }; // eslint-disable-line no-template-curly-in-string

		return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY || "OTHERTESTVALUE";');
	});

	it('recursively expands environment variables', () => {
		files = { '.env': 'KEY=VALUE\nOTHERKEY=$KEY/value' };

		return expect(transformAsync('process.env.OTHERKEY;', options)).resolves.toHaveProperty('code', 'process.env.OTHERKEY || "VALUE/value";');
	});

	it('doesn\'t mutate process.env', async () => {
		process.env.KEY = 'AVALUE';
		process.env.KEY2 = 'BVALUE';

		files = { '.env': 'KEY=ANOTHERVALUE\nKEY3=CVALUE' };

		await expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY || "ANOTHERVALUE";');
		expect(process.env.KEY).toEqual('AVALUE');
		expect(process.env.KEY2).toEqual('BVALUE');
		expect(process.env.KEY3).toBeUndefined();
	});

	['development', '', 'nonsense'].forEach((NODE_ENV) => {
		describe(`NODE_ENV=${NODE_ENV}`, () => {
			beforeAll(() => {
				process.env.NODE_ENV = NODE_ENV;
			});

			it('inlines NODE_ENV=development', () => expect(transformAsync('process.env.NODE_ENV;', options)).resolves.toHaveProperty('code', '"development";'));

			it('.env', () => {
				files = { '.env': 'KEY=VALUE' };

				return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY || "VALUE";');
			});

			it('.env.local', () => {
				files = { '.env.local': 'KEY=VALUE' };

				return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY || "VALUE";');
			});

			it('.env.development', () => {
				files = { '.env.development': 'KEY=VALUE' };

				return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY || "VALUE";');
			});

			it('.env.development.local', () => {
				files = { '.env.development.local': 'KEY=VALUE' };

				return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY || "VALUE";');
			});

			it('not .env.production', () => {
				files = { '.env.production': 'KEY=VALUE' };

				return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY;');
			});

			it('not .env.production.local', () => {
				files = { '.env.production.local': 'KEY=VALUE' };

				return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY;');
			});

			it('not .env.test', () => {
				files = { '.env.test': 'KEY=VALUE' };

				return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY;');
			});

			it('not .env.test.local', () => {
				files = { '.env.test.local': 'KEY=VALUE' };

				return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY;');
			});

			it('prioritizes by specificity', async () => {
				files = {
					'.env':                   'KEY1=VALUE1\nKEY2=VALUE1\nKEY3=VALUE1\nKEY4=VALUE1',
					'.env.local':             'KEY1=VALUE2\nKEY2=VALUE2\nKEY3=VALUE2',
					'.env.development':       'KEY1=VALUE3\nKEY2=VALUE3',
					'.env.development.local': 'KEY1=VALUE4',
				};

				await expect(transformAsync('process.env.KEY1;', options)).resolves.toHaveProperty('code', 'process.env.KEY1 || "VALUE4";');
				await expect(transformAsync('process.env.KEY2;', options)).resolves.toHaveProperty('code', 'process.env.KEY2 || "VALUE3";');
				await expect(transformAsync('process.env.KEY3;', options)).resolves.toHaveProperty('code', 'process.env.KEY3 || "VALUE2";');
				await expect(transformAsync('process.env.KEY4;', options)).resolves.toHaveProperty('code', 'process.env.KEY4 || "VALUE1";');
			});
		});
	});

	describe('NODE_ENV=production', () => {
		beforeAll(() => {
			process.env.NODE_ENV = 'production';
		});

		it('inlines NODE_ENV=production', () => expect(transformAsync('process.env.NODE_ENV;', options)).resolves.toHaveProperty('code', '"production";'));

		it('.env', () => {
			files = { '.env': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY || "VALUE";');
		});

		it('.env.local', () => {
			files = { '.env.local': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY || "VALUE";');
		});

		it('.env.production', () => {
			files = { '.env.production': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY || "VALUE";');
		});

		it('.env.production.local', () => {
			files = { '.env.production.local': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY || "VALUE";');
		});

		it('not .env.development', () => {
			files = { '.env.development': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY;');
		});

		it('not .env.development.local', () => {
			files = { '.env.development.local': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY;');
		});

		it('not .env.test', () => {
			files = { '.env.test': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY;');
		});

		it('not .env.test.local', () => {
			files = { '.env.test.local': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY;');
		});

		it('prioritizes by specificity', async () => {
			files = {
				'.env':                  'KEY1=VALUE1\nKEY2=VALUE1\nKEY3=VALUE1\nKEY4=VALUE1',
				'.env.local':            'KEY1=VALUE2\nKEY2=VALUE2\nKEY3=VALUE2',
				'.env.production':       'KEY1=VALUE3\nKEY2=VALUE3',
				'.env.production.local': 'KEY1=VALUE4',
			};

			await expect(transformAsync('process.env.KEY1;', options)).resolves.toHaveProperty('code', 'process.env.KEY1 || "VALUE4";');
			await expect(transformAsync('process.env.KEY2;', options)).resolves.toHaveProperty('code', 'process.env.KEY2 || "VALUE3";');
			await expect(transformAsync('process.env.KEY3;', options)).resolves.toHaveProperty('code', 'process.env.KEY3 || "VALUE2";');
			await expect(transformAsync('process.env.KEY4;', options)).resolves.toHaveProperty('code', 'process.env.KEY4 || "VALUE1";');
		});
	});

	describe('NODE_ENV=test', () => {
		beforeAll(() => {
			process.env.NODE_ENV = 'test';
		});

		it('inlines NODE_ENV=test', () => expect(transformAsync('process.env.NODE_ENV;', options)).resolves.toHaveProperty('code', '"test";'));

		it('.env', () => {
			files = { '.env': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY || "VALUE";');
		});

		it('.env.test', () => {
			files = { '.env.test': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY || "VALUE";');
		});

		it('.env.test.local', () => {
			files = { '.env.test.local': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY || "VALUE";');
		});

		it('not .env.local', () => {
			files = { '.env.local': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY;');
		});

		it('not .env.development', () => {
			files = { '.env.development': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY;');
		});

		it('not .env.development.local', () => {
			files = { '.env.development.local': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY;');
		});

		it('not .env.production', () => {
			files = { '.env.production': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY;');
		});

		it('not .env.production.local', () => {
			files = { '.env.production.local': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY;');
		});

		it('prioritizes by specificity', async () => {
			files = {
				'.env':            'KEY1=VALUE1\nKEY2=VALUE1\nKEY3=VALUE1',
				'.env.test':       'KEY1=VALUE3\nKEY2=VALUE3',
				'.env.test.local': 'KEY1=VALUE4',
			};

			await expect(transformAsync('process.env.KEY1;', options)).resolves.toHaveProperty('code', 'process.env.KEY1 || "VALUE4";');
			await expect(transformAsync('process.env.KEY2;', options)).resolves.toHaveProperty('code', 'process.env.KEY2 || "VALUE3";');
			await expect(transformAsync('process.env.KEY3;', options)).resolves.toHaveProperty('code', 'process.env.KEY3 || "VALUE1";');
		});
	});
});
