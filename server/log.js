const fs = require( 'fs' );
const minilog = require( 'minilog' );

minilog.enable();
minilog.pipe( fs.createWriteStream( `/tmp/log` ) );

module.exports = minilog( 'packd' );