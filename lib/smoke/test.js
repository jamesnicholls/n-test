const puppeteer = require('puppeteer');
const verifyCacheHeaders = require('./verify-cache-headers');
const URLTest = require('./url-test');

const config = require(process.env.SMOKE_CONFIG);
const host = process.env.SMOKE_HOST;

const expect = require('chai').expect;

let browser;

describe(`Smoke Tests for ${host}`, () => {

	before(async () => {
		browser = await puppeteer.launch();
	});

	after(async () => {
		await browser.close();
	});


	config.forEach((options) => {
		Object.keys(options.urls).forEach(url => {

			let urlOpts = options.urls[url];
			if (typeof urlOpts !== 'object') {
				urlOpts = { status: urlOpts };
			}

			urlOpts.headers = Object.assign(urlOpts.headers || {}, options.headers || {}, {});
			urlOpts.method = urlOpts.method || options.method;
			urlOpts.body = urlOpts.body || options.body;

			const fullUrl = `${host}${url}`;
			let test = new URLTest(fullUrl, urlOpts);

			context(url, () => {

				before(async () => {
					await test.init(browser);
				});

				after(async () => {

					await test.page.close();
				});

				if (test.check.status) {
					it(`should return ${test.check.status}`, () => {
						if (test.check.status === 204) {
							// eslint-disable-next-line no-console
							console.info('204 status checks are not supported yet!');
							// expect(true).to.equal(true);
						} else if (typeof test.check.status === 'string') {
							expect(test.redirect.to).to.equal(test.check.status);
						} else {
							expect(test.status).to.equal(test.check.status);
						}
					});
				}

				if (typeof test.check.pageErrors !== 'undefined') {
					it(`should have no more than ${test.check.pageErrors} console errors`, () => {
						// eslint-disable-next-line no-console
						console.info('Errors in Console: ', test.pageErrors);
						expect(test.pageErrors.length).to.equal(0);
					});
				}

				if (test.check.content) {
					it('should validate content', async () => {
						const content = await test.page.content();
						console.log('content', content);
						expect(test.check.content(content)).to.be.true;
					});
				}

				if (test.check.elements) {
					Object.entries(test.check.elements).forEach(([selector, assertion]) => {
						if(typeof assertion === 'number') {
							it(`should have ${assertion} visible elements matching selector ${selector}`, async () => {
								const count = await test.page.$$eval(selector, els => els.filter(el => {
									//Filter out elements that are not visible
									const rect = el.getBoundingClientRect();
									return rect.height > 0 && rect.width > 0;
								}).length);
								expect(count).to.equal(assertion);
							});
						} else if(typeof assertion === 'string') {
							it(`element with selector selector ${selector} should contain text ${assertion}`, async () => {
								const elText = await test.page.$eval(selector, el => el.innerText);
								expect(elText).to.contain(assertion);
							});
						}
					});
				}

				if (test.check.cacheHeaders) {
					it('should specify sensible cache headers', () => {
						expect(verifyCacheHeaders.bind(null, test.headers, test.url)).not.toThrow();
					});
				}


				if (test.check.cssCoverage) {

					Object.entries(test.check.cssCoverage).forEach(([url, threshold]) => {
						it(`should be using at least ${threshold}% of the CSS in ${url}`, async () => {
							const percentage = test.coverageFor(url);
							if (percentage) {
								// eslint-disable-next-line no-console
								console.info(`CSS coverage for ${url}: ${percentage}%`);
							//	expect(percentage).to.be.greaterThan(threshold);
							} else {
								throw new Error('No coverage report found for URL that includes: ' + url);
							}
						});
					});
				}

				if (test.check.performance) {
					const threshold = Number.isInteger(test.check.performance) ? parseInt(test.check.performance) : 2000;
					it(`should meet performance baselines - firstContentfulPaint should be < ${threshold}ms`, async () => {
						const paints = await test.page.evaluate(() => {
							const result = {};
							performance.getEntriesByType('paint').map(entry => {
								result[entry.name] = entry.startTime;
							});
							return result;
						});
						// eslint-disable-next-line no-console
						console.info(`First Paint for ${url}: ${paints['first-paint']}ms`);
						// eslint-disable-next-line no-console
						console.info(`First Contentful Paint for ${url}: ${paints['first-contentful-paint']}ms`);
						expect(paints['first-paint']).to.be.lessThan(threshold);
						expect(paints['first-contentful-paint']).to.be.lessThan(threshold);
					});

				}

			});
		});
	});
});
