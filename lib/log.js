const sander = require( 'sander' );
const minilog = require( 'minilog' );
const { root } = require( '../config.js' );

minilog.enable();
minilog.pipe( sander.createWriteStream( `${root}/tmp/log` ) );

module.exports = minilog( 'packd' );