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

	fs.existsSync.mockImplementation((filePath) => (
		Object.prototype.hasOwnProperty.call(files, relativePath(filePath))
	));
	fs.readFileSync.mockImplementation((filePath, { encoding }) => (
		Object.prototype.hasOwnProperty.call(files, relativePath(filePath)) && encoding === 'utf8' && files[relativePath(filePath)]
	));

	beforeEach(() => {
		files = {};
	});

	it('is named babel-plugin-universal-dotenv', () => expect(plugin({ types: {} }).name).toEqual('babel-plugin-universal-dotenv'));

	it('ignores empty code', () => expect(transformAsync('', options)).resolves.toHaveProperty('code', ''));

	it('ignores unknown env vars', () => expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY;'));

	it('expands environment variables', () => {
		process.env.TEST = 'TESTVALUE';

		files = { '.env': 'KEY=$TEST' };

		return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY || "TESTVALUE";');
	});

	it('expands environment variables in curly braces', () => {
		process.env.TEST = 'OTHERTESTVALUE';

		files = { '.env': 'KEY=${TEST}' }; // eslint-disable-line no-template-curly-in-string

		return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY || "OTHERTESTVALUE";');
	});

	it('expands environment variables recursively', () => {
		files = { '.env': 'KEY=VALUE\nOTHERKEY=$KEY/value' };

		return expect(transformAsync('process.env.OTHERKEY;', options)).resolves.toHaveProperty('code', 'process.env.OTHERKEY || "VALUE/value";');
	});

	it('leaves environment variables alone', async () => {
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

			it('uses .env', () => {
				files = { '.env': 'KEY=VALUE' };

				return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY || "VALUE";');
			});

			it('uses .env.local', () => {
				files = { '.env.local': 'KEY=VALUE' };

				return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY || "VALUE";');
			});

			it('uses .env.development', () => {
				files = { '.env.development': 'KEY=VALUE' };

				return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY || "VALUE";');
			});

			it('uses .env.development.local', () => {
				files = { '.env.development.local': 'KEY=VALUE' };

				return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY || "VALUE";');
			});

			it('doesn\'t use .env.test', () => {
				files = { '.env.test': 'KEY=VALUE' };

				return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY;');
			});

			it('doesn\'t use .env.test.local', () => {
				files = { '.env.test.local': 'KEY=VALUE' };

				return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY;');
			});

			it('doesn\'t use .env.production', () => {
				files = { '.env.production': 'KEY=VALUE' };

				return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY;');
			});

			it('doesn\'t use .env.production.local', () => {
				files = { '.env.production.local': 'KEY=VALUE' };

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

	describe('NODE_ENV=test', () => {
		beforeAll(() => {
			process.env.NODE_ENV = 'test';
		});

		it('inlines NODE_ENV=test', () => expect(transformAsync('process.env.NODE_ENV;', options)).resolves.toHaveProperty('code', '"test";'));

		it('uses .env', () => {
			files = { '.env': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY || "VALUE";');
		});

		it('doesn\'t use .env.local', () => {
			files = { '.env.local': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY;');
		});

		it('doesn\'t use .env.development', () => {
			files = { '.env.development': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY;');
		});

		it('doesn\'t use .env.development.local', () => {
			files = { '.env.development.local': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY;');
		});

		it('uses .env.test', () => {
			files = { '.env.test': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY || "VALUE";');
		});

		it('uses .env.test.local', () => {
			files = { '.env.test.local': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY || "VALUE";');
		});

		it('doesn\'t use .env.production', () => {
			files = { '.env.production': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY;');
		});

		it('doesn\'t use .env.production.local', () => {
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

	describe('NODE_ENV=production', () => {
		beforeAll(() => {
			process.env.NODE_ENV = 'production';
		});

		it('inlines NODE_ENV=production', () => expect(transformAsync('process.env.NODE_ENV;', options)).resolves.toHaveProperty('code', '"production";'));

		it('uses .env', () => {
			files = { '.env': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY || "VALUE";');
		});

		it('uses .env.local', () => {
			files = { '.env.local': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY || "VALUE";');
		});

		it('doesn\'t use .env.development', () => {
			files = { '.env.development': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY;');
		});

		it('doesn\'t use .env.development.local', () => {
			files = { '.env.development.local': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY;');
		});

		it('doesn\'t use .env.test', () => {
			files = { '.env.test': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY;');
		});

		it('doesn\'t use .env.test.local', () => {
			files = { '.env.test.local': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY;');
		});

		it('uses .env.production', () => {
			files = { '.env.production': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY || "VALUE";');
		});

		it('uses .env.production.local', () => {
			files = { '.env.production.local': 'KEY=VALUE' };

			return expect(transformAsync('process.env.KEY;', options)).resolves.toHaveProperty('code', 'process.env.KEY || "VALUE";');
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
});
