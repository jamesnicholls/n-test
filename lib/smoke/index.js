/* globals jest */
const path = require('path');
const fs = require('fs');


module.exports.run = (opts) => {
	const testFile = path.join(path.dirname(fs.realpathSync(__filename)), 'test.js');
	const configFile = opts.config || path.join(process.cwd(), 'smoke.json');
	if (!fs.existsSync(configFile)) {
		throw new Error(`Config file for smoke test does not exist at ${configFile}. Either create a config file at ./test/smoke.json, or pass in a path using --config.`);
	} else {

		process.env.SMOKE_CONFIG = configFile;
		process.env.SMOKE_HOST = opts.host || 'http://localhost:3002';

		//If running the tests, jest will already be defined on the global scope, so check it exists first.
		if(typeof jest === 'undefined') {
			//When running actual smoke tests...
			const jest = require('jest');
			return jest.runCLI({ _: [testFile], noStackTrace: true, }, [process.cwd()]);
		} else {
			//When running this repo's tests...
			jest = require('jest');
			//disable the color of the real jest run, so it doesn't get confused with the test's test
			process.env.FORCE_COLOR=0;
			return jest.runCLI({ _: [testFile], noStackTrace: true, }, [process.cwd()])
				.then((results) => {
					delete process.env.FORCE_COLOR;
					return results;
				});
		}
	}
};
