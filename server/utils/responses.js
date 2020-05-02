module.exports.sendBadRequest = function sendBadRequest(res, msg) {
	res.status(400);
	res.end(msg);
};

module.exports.sendError = function sendError(res, msg) {
	res.status(500);
	res.set('Content-Type', 'text/html');
	res.end(msg);
};
