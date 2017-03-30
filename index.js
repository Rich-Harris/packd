const fs = require( 'fs' );
const path = require( 'path' );
const express = require( 'express' );
const serveStatic = require( 'serve-static' );
const compression = require( 'compression' );
const servePackage = require( './lib/serve-package.js' );

const { root } = require( './config.js' );

const app = express();

app.use( compression() );

app.use( express.static( `${root}/public`, {
	maxAge: 600
}));

app.get( '/:id', servePackage );

app.get( '/', ( req, res ) => {
	fs.createReadStream( `${root}/public/index.html` ).pipe( res );
});

app.listen( 9000, () => {
	console.log( 'listening on localhost:9000' );
});