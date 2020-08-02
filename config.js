const path = require( 'path' );
const sander = require( 'sander' );
const tempdir = require('tempdir');

exports.root = path.resolve( __dirname );
exports.tmpdir = tempdir.sync();
exports.registry = 'https://registry.npmjs.org';

if ( !process.env.NOW ) {
	try {
		sander.rimrafSync( exports.tmpdir );
		sander.mkdirSync( exports.tmpdir );
	} catch ( err ) {
		// already exists
	}
}

exports.npmInstallEnvVars = [];
exports.debugEndpoints = true;

exports.additionalBundleResHeaders = {
	'Cache-Control': 'max-age=86400',
};

if (process.env.BUNDLE_RUN) {
	exports.tmpdir = "/tmp";
	const cacheExpiration = 60 * 60 * 24 * 365;
	exports.npmInstallEnvVars = ["npm_config_cache=/tmp"];
	exports.debugEndpoints = false;
	exports.additionalBundleResHeaders = {
		'Cache-Control': 'public, max-age=' + cacheExpiration,
		'X-Content-Type-Options': 'nosniff',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Request-Method': 'GET',
		'X-Powered-By': 'github.com/rich-harris/packd',
		'Strict-Transport-Security': `max-age=${cacheExpiration}; includeSubDomains; preload`,
	};
}

