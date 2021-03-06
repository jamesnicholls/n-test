const assert = require('assert');

module.exports = [{
		urls: {
			'/status/503': 200,
			'/status/404': {
				status: 404
			},
			'/coverage/bad': {
				cssCoverage: {
					'coverage/bad': 50
				}
			},
			'/coverage/okay': {
				cssCoverage: {
					'coverage/okay': 60
				}
			},
			'/jank': {
				elementShifts: {
					'.content': {
						maxCount: 0
					}
				}
			},
			'/json': {
				content: (body) => {
					assert.equal(body.key, 'wrong-value');
				}
			}
		}
	}

];
