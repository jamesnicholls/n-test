/* globals jest */
const path = require('path');
const fs = require('fs');

const Mocha = require('Mocha');

const mocha = new Mocha({
	timeout: 5000,
	useColors: true
});

module.exports.run = (opts) => {
	const testFile = path.join(path.dirname(fs.realpathSync(__filename)), 'test.js');
	const configFile = path.join(process.cwd(), opts.config || 'test/smoke.js');
	if (!fs.existsSync(configFile)) {
		throw new Error(`Config file for smoke test does not exist at ${configFile}. Either create a config file at ./test/smoke.js, or pass in a path using --config.`);
	} else {

		let host = opts.host || 'http://local.ft.com:3002';

		if (!/:|\./.test(host)) {
			host += '.herokuapp.com';
		}

		if (!/https?\:\/\//.test(host)) {
			host = 'http://' + host;
		}

		process.env.SMOKE_CONFIG = configFile;
		process.env.SMOKE_HOST = host;
		process.env.SMOKE_AUTHENTICATE = opts.authenticate;

		mocha.addFile(testFile);

		return new Promise((resolve, reject) => {
			
			mocha.run((failures) => {
				if(failures) {
					reject(failures);
				} else {
					resolve(failures);
				}
				process.on('exit', function () {
					process.exit(failures);  // exit with non-zero status if there were failures
				});
			});
		});

	}
};
