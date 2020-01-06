const { fork } = require('child_process');
const sander = require('sander');
const semver = require('semver');
const zlib = require('zlib');
const get = require('./utils/get.js');
const findVersion = require('./utils/findVersion.js');
const logger = require('./logger.js');
const cache = require('./cache.js');
const etag = require('etag');
const sha1 = require('sha1');

const { sendBadRequest, sendError } = require('./utils/responses.js');
const { root, registry, additionalBundleResHeaders } = require('../config.js');

function stringify(query) {
	const str = Object.keys(query)
		.sort()
		.map(key => `${key}=${query[key]}`)
		.join('&');
	return str ? `?${str}` : '';
}

module.exports = function servePackage(req, res, next) {
	if (req.method !== 'GET') return next();

	const match = /^\/(?:@([^\/]+)\/)?([^@\/]+)(?:@(.+?))?(?:\/(.+?))?(?:\?(.+))?$/.exec(
		req.url
	);

	if (!match) {
		// TODO make this prettier
		return sendBadRequest(res, 'Invalid module ID');
	}

	const user = match[1];
	const id = match[2];
	const tag = match[3] || 'latest';
	const deep = match[4];
	const queryString = match[5];

	const qualified = user ? `@${user}/${id}` : id;
	const query = (queryString || '').split('&').reduce((query, pair) => {
		if (!pair) return query;

		const [key, value] = pair.split('=');
		query[key] = value || true;
		return query;
	}, {});

	if (query.format && (query.format !== 'umd' && query.format !== 'esm')) {
		return sendBadRequest(res, 'Invalid format (must be umd or esm)');
	}

	get(`${registry}/${encodeURIComponent(qualified).replace('%40', '@')}`)
		.then(JSON.parse)
		.then(meta => {
			if (!meta.versions) {
				logger.error(`[${qualified}] invalid module`);

				return sendBadRequest(res, 'invalid module');
			}

			const version = findVersion(meta, tag);

			if (!semver.valid(version)) {
				logger.error(`[${qualified}] invalid tag`);

				return sendBadRequest(res, 'invalid tag');
			}

			if (version !== tag) {
				let url = `/${meta.name}@${version}`;
				if (deep) url += `/${deep}`;
				url += stringify(query);

				res.redirect(302, url);
				return;
			}

			return fetchBundle(meta, tag, deep, query).then(zipped => {
				logger.info(`[${qualified}] serving ${zipped.length} bytes`);
				res.status(200);
				res.set(
					Object.assign(
						{
							'Content-Length': zipped.length,
							'Content-Type': 'application/javascript; charset=utf-8',
							'Content-Encoding': 'gzip'
						},
						additionalBundleResHeaders
					)
				);

				// FIXME(sven): calculate the etag based on the original content
				res.setHeader('ETag', etag(zipped));
				res.end(zipped);
			});
		})
		.catch(err => {
			logger.error(`[${qualified}] ${err.message}`, err.stack);
			const page = sander
				.readFileSync(`${root}/server/templates/500.html`, {
					encoding: 'utf-8'
				})
				.replace('__ERROR__', err.message);

			sendError(res, page);
		});
};

const inProgress = {};

function fetchBundle(pkg, version, deep, query) {
	let hash = `${pkg.name}@${version}`;
	if (deep) hash += `_${deep.replace(/\//g, '_')}`;
	hash += stringify(query);

	logger.info(`[${pkg.name}] requested package`);

	hash = sha1(hash);

	if (cache.has(hash)) {
		logger.info(`[${pkg.name}] is cached`);
		return Promise.resolve(cache.get(hash));
	}

	if (inProgress[hash]) {
		logger.info(`[${pkg.name}] request was already in progress`);
	} else {
		logger.info(`[${pkg.name}] is not cached`);

		inProgress[hash] = createBundle(hash, pkg, version, deep, query)
			.then(
				result => {
					const zipped = zlib.gzipSync(result);
					cache.set(hash, zipped);
					return zipped;
				},
				err => {
					inProgress[hash] = null;
					throw err;
				}
			)
			.then(zipped => {
				inProgress[hash] = null;
				return zipped;
			});
	}

	return inProgress[hash];
}

function createBundle(hash, pkg, version, deep, query) {
	return new Promise((fulfil, reject) => {
		const child = fork('server/child-processes/create-bundle.js');

		child.on('message', message => {
			if (message === 'ready') {
				child.send({
					type: 'start',
					params: { hash, pkg, version, deep, query }
				});
			}

			if (message.type === 'info') {
				logger.info(message.message);
			} else if (message.type === 'error') {
				const error = new Error(message.message);
				error.stack = message.stack;

				reject(error);
				child.kill();
			} else if (message.type === 'result') {
				fulfil(message.code);
				child.kill();
			}
		});
	});
}
