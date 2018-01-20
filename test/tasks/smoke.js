/*globals beforeAll, expect */

const server = require('../server/app');
const smoke = require('../../lib/smoke');

const expect = require('chai').expect;

describe('Smoke Tests of the Smoke', () => {

	before(() => {
		//Start the server
		server.listen(3004);
	});

	context('status checks', () => {
		it('tests should pass if all the urls return the correct status',  (done) => {

			smoke.run({
				host: 'http://localhost:3004',
				config: 'test/fixtures/smoke-status-pass.js'
			})
			.then((failures) => {
				expect(failures).to.equal(0);
				done();
			});
		});

		it('tests should fail if some urls return the incorrect status code', (done) => {

			smoke.run({
				host: 'http://localhost:3004',
				config: 'test/fixtures/smoke-status-fail.js',
			})
			.catch((failures) => {
				expect(failures).to.equal(2);
				done();
			});
		});
	});

	context('CSS coverage', () => {
		it('tests should pass if CSS is well covered', (done) => {

			smoke.run({
				host: 'http://localhost:3004',
				config: 'test/fixtures/smoke-coverage-pass.js'
			})
			.then((failures) => {
				expect(failures).to.equal(0);
				done();
			});
		});

		it('tests should fail if CSS coverage is below threshold', (done) => {

			smoke.run({
				host: 'http://localhost:3004',
				config: 'test/fixtures/smoke-coverage-fail.js',
			})
			.catch((failures) => {
				expect(failures).to.equal(2);
				done();
			});
		});
	});

});
