const fs = require( 'fs' );
const minilog = require( 'minilog' );
const { root } = require( '../config.js' );

minilog.enable();
minilog.pipe( fs.createWriteStream( `${root}/log` ) );

module.exports = minilog( 'packd' );