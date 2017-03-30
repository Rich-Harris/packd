const fs = require( 'fs' );
const express = require( 'express' );
const compression = require( 'compression' );
const servePackage = require( './lib/serve-package.js' );
const log = require( './lib/log.js' );

const { root } = require( './config.js' );

const app = express();

app.use( compression() );

app.use( '/log', ( req, res ) => {
	res.sendFile( `${root}/log` );
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
	fs.createReadStream( `${root}/public/index.html` ).pipe( res );
});

app.listen( 9000, () => {
	console.log( 'listening on localhost:9000' );
});