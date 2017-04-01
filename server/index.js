const fs = require( 'fs' );
const readline = require( 'readline' );
const express = require( 'express' );
const compression = require( 'compression' );
const favicon = require( 'serve-favicon' );
const servePackage = require( './serve-package.js' );
const log = require( './log.js' );

const { root, tmpdir } = require( '../config.js' );

const app = express();

app.use( favicon( `${root}/public/favicon.ico` ) );
app.use( compression() );

app.use( '/_log', ( req, res ) => {
	const filter = req.query.filter;
	if ( filter ) {
		const rl = readline.createInterface({
			input: fs.createReadStream( `${tmpdir}/log` )
		});

		const pattern = new RegExp( `^packd \\w+ \\[${req.query.filter}\\]` );

		rl.on( 'line', line => {
			if ( pattern.test( line ) ) res.write( line + '\n' );
		});

		rl.on( 'close', () => {
			res.end();
		});
	} else {
		res.sendFile( `${tmpdir}/log` );
	}
});

app.use( ( req, res, next ) => {
	const remoteAddr = (function () {
		if (req.ip) return req.ip;
		const sock = req.socket;
		if (sock.socket) return sock.socket.remoteAddress;
		if (sock.remoteAddress) return sock.remoteAddress;
		return ' - ';
	})();
	const date = new Date().toUTCString();
	const url = req.originalUrl || req.url;
	const httpVersion = req.httpVersionMajor + '.' + req.httpVersionMinor;

	log.info( `${remoteAddr} - - [${date}] "${req.method} ${url} HTTP/${httpVersion}"` );
	next();
});

app.use( express.static( `${root}/public`, {
	maxAge: 600
}));

app.get( '/bundle/:id', servePackage );

app.get( '/', ( req, res ) => {
	res.status( 200 );
	const index = fs.readFileSync( `${root}/server/templates/index.html`, 'utf-8' )
		.replace( '__VERSION__', require( '../package.json' ).version );

	res.end( index );
});

app.listen( 9000, () => {
	console.log( 'listening on localhost:9000' );
});