const fs = require( 'fs' );
const readline = require( 'readline' );
const express = require( 'express' );
const compression = require( 'compression' );
const prettyBytes = require( 'pretty-bytes' );
const favicon = require( 'serve-favicon' );
const pkgInfo = require( '../package.json' );
const padRight = require( './utils/padRight.js' );
const servePackage = require( './serve-package.js' );
const logger = require( './logger.js' );
const cache = require( './cache.js' );

const { root, tmpdir } = require( '../config.js' );

const app = express();
const port = process.env.PORT || 9000;

app.use( favicon( `${root}/public/favicon.ico` ) );
app.use( compression() );

app.get( '/_log', ( req, res ) => {
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

app.get( '/_cache', ( req, res ) => {
	res.status( 200 );
	res.set({
		'Content-Type': 'text/plain'
	});

	res.write( `Total cached bundles: ${prettyBytes( cache.length )}\n` );

	const table = [];
	let maxKey = 7; // 'package'.length
	let maxSize = 4; // 'size'.length

	cache.forEach( ( value, pkg ) => {
		const size = value.length;
		const sizeLabel = prettyBytes( size );

		table.push({ pkg, size, sizeLabel });

		maxKey = Math.max( maxKey, pkg.length );
		maxSize = Math.max( maxSize, sizeLabel.length );
	});

	if ( req.query.sort === 'size' ) {
		table.sort( ( a, b ) => b.size - a.size );
	}

	const separator = padRight( '', maxKey + maxSize + 5, '─' );

	res.write( `┌${separator}┐\n` );
	res.write( `│ ${padRight( 'package', maxKey )} │ ${padRight( 'size', maxSize )} │\n` );
	res.write( `├${separator}┤\n` );

	table.forEach( row => {
		res.write( `│ ${padRight( row.pkg, maxKey )} │ ${padRight( row.sizeLabel, maxSize )} │\n` );
	});
	res.write( `└${separator}┘\n` );

	res.end();
});

// log requests
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

	logger.info( `${remoteAddr} - - [${date}] "${req.method} ${url} HTTP/${httpVersion}"` );
	next();
});

// redirect /bundle/foo to /foo
app.get( '/bundle/:id', ( req, res ) => {
	const queryString = Object.keys( req.query )
		.map( key => `${key}=${encodeURIComponent( req.query[ key ] )}` )
		.join( '&' );

	let url = req.url.replace( '/bundle', '' );
	if ( queryString ) url += `?${queryString}`;

	res.redirect( 301, url );
});

app.use( express.static( `${root}/public`, {
	maxAge: 600
}));

app.get( '/', ( req, res ) => {
	res.status( 200 );
	const index = fs.readFileSync( `${root}/server/templates/index.html`, 'utf-8' )
		.replace( '__VERSION__', pkgInfo.version );

	res.end( index );
});

app.use( servePackage );

// TODO 404

app.listen( port, () => {
	logger.log( `started at ${new Date().toUTCString()}` );
	console.log( 'listening on localhost:' + port );
});
