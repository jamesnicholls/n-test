const REDIRECT_CODES = [301, 302, 303, 307, 308];

const DIMENSIONS = {
	'XL': { width: 1220, height: 720 },
	'L': { width: 1024, height: 768 },
	'M': { width: 768, height: 1024 },
	'S': { width: 540, height: 960 },
	'default': { width: 320, height: 480, deviceScaleFactor: 2 }
};

class TestPage {

	constructor (url, options) {
		this.browser = null;
		this.url = url;
		this.requestHeaders = options.headers;
		this.method = options.method || 'GET';
		this.postData = options.body;
		this.dimensions = DIMENSIONS[options.breakpoint] || DIMENSIONS['XL'];

		this.check = {
			status: options.status,
			cssCoverage: options.cssCoverage,
			pageErrors: options.pageErrors,
			cacheHeaders: options.cacheHeaders,
			content: options.content,
			performance: options.performance,
			elements: options.elements
		};


		this.pageErrors = [];
		this.consoleMessages = [];
		this.coverageReports = [];
		this.redirects = [];
		this.response = null;
		this.headers = null;
	}

	async init (browser) {
		this.browser = browser;
		this.page = await this.browser.newPage();

		if(this.check.status === 204) {
			return;
		}

		this.page.setViewport(this.dimensions);


		if(this.check.cssCoverage) {
			this.page.coverage.startCSSCoverage();
		}

		if(this.requestHeaders) {
			await this.page.setExtraHTTPHeaders(this.requestHeaders);
		}

		this.page.on('pageerror', (message) => {
			this.pageErrors.push(message);
		});

		this.page.on('console', (message) => {
			this.consoleMessages.push(message);
		});

		if(this.method !== 'GET') {
			// Intercept page requests, we need to do this in order
			// to set the HTTP method or post data
			await this.page.setRequestInterception(true);

			// Intercept requests so we can set the HTTP method
			// and post data. We only want to make changes to the
			// first request that's handled, which is the request
			// for the page we're testing
			let interceptionHandled = false;

			this.page.on('request', interceptedRequest => {
				const overrides = {};
				if (!interceptionHandled) {

					overrides.method = this.method;
					// Override the request POST data if present
					if (this.postData) {
						if(typeof this.postData === 'object') {
							this.postData = JSON.stringify(this.postData);
						}
						overrides.postData = this.postData;
						overrides.headers = this.requestHeaders;

						if(!overrides.headers['Content-Type']) {
							overrides.headers['Content-Type'] = 'application/json';
						}
					}

					interceptionHandled = true;
				}
				interceptedRequest.continue(overrides);
			});

		}

		this.page.on('response', response => {
			const request = response.request();
			const status = response.status();
			// if this response is a redirect
			if (REDIRECT_CODES.includes(status)) {
				this.redirects[request.url()] = {
					code: status,
					to: response.headers().location
				};
			}
		});

		const waitUntil = (this.check.cssCoverage || this.check.pageErrors) ? 'load' : 'domcontentloaded';
		this.response = await this.page.goto(this.url, { waitUntil });
		this.headers = this.response.headers();
		if(this.check.cssCoverage) {
			this.coverageReports = await this.page.coverage.stopCSSCoverage();
		}

	}

	get status () {
		return REDIRECT_CODES.includes(this.check.status) ?
			this.redirects[this.url].code :
			this.response.status();
	}

	get redirect () {
		return this.redirects[this.url];
	}

	coverageFor (url) {
		const cssFile = this.coverageReports.find(report => report.url.endsWith(url));
		if (cssFile) {
			const totalUsed = cssFile.ranges.reduce((current, range) => {
				return current + (range.end - range.start);
			}, 0);
			return Number(((totalUsed / cssFile.text.length) * 100).toFixed(1));
		} else {
			return false;
		}
	}

};

module.exports = TestPage;