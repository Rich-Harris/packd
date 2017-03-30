const path = require( 'path' );
const sander = require( 'sander' );

exports.root = path.resolve( __dirname );
exports.tmpdir = process.env.NOW ? `/tmp` : `${exports.root}/.tmp`;
exports.registry = `http://registry.npmjs.org`;

if ( !process.env.NOW ) {
	try {
		sander.rimrafSync( exports.tmpdir );
		sander.mkdirSync( exports.tmpdir );
	} catch ( err ) {
		// already exists
	}
}