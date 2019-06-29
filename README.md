[![current version](https://img.shields.io/npm/v/babel-plugin-universal-dotenv.svg)](https://www.npmjs.com/package/babel-plugin-universal-dotenv)
[![Build Status](https://travis-ci.org/saiichihashimoto/babel-plugin-universal-dotenv.svg?branch=master)](https://travis-ci.org/saiichihashimoto/babel-plugin-universal-dotenv)
[![Coverage Status](https://coveralls.io/repos/github/saiichihashimoto/babel-plugin-universal-dotenv/badge.svg?branch=master)](https://coveralls.io/github/saiichihashimoto/babel-plugin-universal-dotenv?branch=master)
[![Mutation testing badge](https://badge.stryker-mutator.io/github.com/saiichihashimoto/babel-plugin-universal-dotenv/master)](https://stryker-mutator.github.io)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Greenkeeper badge](https://badges.greenkeeper.io/saiichihashimoto/babel-plugin-universal-dotenv.svg)](https://greenkeeper.io/)

[create-react-app's dotenv resolution](https://facebook.github.io/create-react-app/docs/adding-custom-environment-variables#adding-development-environment-variables-in-env) as a babel plugin.

*The environment variables from `.env` files are embedded using babel*. These environment variables are defined for you on `process.env`.

`NODE_ENV` is also embedded and must be one of `production`, `test`, or `development`, defaulting to `development` in all other cases.

# Adding Development Environment Variables In `.env`

To define permanent environment variables, create a file called `.env` in the root of your project:

```
SECRET_CODE=abcdef
```

> Changing any environment variables will require you to restart the development server if it is running.

`.env` files **should be** checked into source control (with the exclusion of `.env*.local`).

# What other `.env` files can be used?

- `.env`: Default.
- `.env.local`: Local overrides. **This file is loaded for all environments except test.**
- `.env.development`, `.env.test`, `.env.production`: Environment-specific settings.
- `.env.development.local`, `.env.test.local`, `.env.production.local`: Local overrides of environment-specific settings.

Files on the left have more priority than files on the right:

- `npm start`: `.env.development.local`, `.env.development`, `.env.local`, `.env`
- `npm run build`: `.env.production.local`, `.env.production`, `.env.local`, `.env`
- `npm test`: `.env.test.local`, `.env.test`, `.env` (note `.env.local` is missing)

These variables will act as the defaults if the machine does not explicitly set them.<br>
Please refer to the [dotenv documentation](https://github.com/motdotla/dotenv) for more details.

> Note: If you are defining environment variables for development, your CI and/or hosting platform will most likely need
> these defined as well. Consult their documentation how to do this. For example, see the documentation for [Travis CI](https://docs.travis-ci.com/user/environment-variables/) or [Heroku](https://devcenter.heroku.com/articles/config-vars).

# Expanding Environment Variables In `.env`

> Note: this feature is available with `babel-plugin-universal-dotenv@1.1.0` and higher.

Expand variables already on your machine for use in your `.env` file (using [dotenv-expand](https://github.com/motdotla/dotenv-expand)).

For example, to get the environment variable `npm_package_version`:

```
VERSION=$npm_package_version
# also works:
# VERSION=${npm_package_version}
```

Or expand variables local to the current `.env` file:

```
DOMAIN=www.example.com
FOO=$DOMAIN/foo
BAR=$DOMAIN/bar
```

# Comparison with other packages

- [create-react-app](https://facebook.github.io/create-react-app/docs/adding-custom-environment-variables#adding-development-environment-variables-in-env) is the inspiration for this package. This plugin is unnecessary when using create-react-app, but brings the same functionality to other contexts.
- [universal-dotenv](https://www.npmjs.com/package/universal-dotenv) was another inspiration. It modifies the rules from create-react-app to be universal. It needs to be `require`ed or `import`ed in the application entry point or webpack can use [`DefinePlugin`](https://www.npmjs.com/package/universal-dotenv#serialization). This plugin aims to bring similar functionality to babel. We consciously avoided the prefixing logic due to the environment variable leakage being less of an issue in a server-side context.
