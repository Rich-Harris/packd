const { onBadRequest, onError } = require('../../config.js');

module.exports.sendBadRequest = function sendBadRequest(res, msg) {
	res.status(400);

	if (typeof onBadRequest === 'function') {
		onBadRequest(res);
	}

	res.end(msg);
};

module.exports.sendError = function sendError(res, msg) {
	res.status(500);

	if (typeof onError === 'function') {
		onError(res);
	}

	res.end(msg);
};
