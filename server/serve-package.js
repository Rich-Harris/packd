const path = require( 'path' );
const sander = require( 'sander' );
const semver = require( 'semver' );
const targz = require( 'tar.gz' );
const zlib = require( 'zlib' );
const request = require( 'request' );
const child_process = require( 'child_process' );
const browserify = require( 'browserify' );
const rollup = require( 'rollup' );
const resolve = require( 'rollup-plugin-node-resolve' );
const UglifyJS = require( 'uglifyjs' );
const isModule = require( 'is-module' );
const get = require( './utils/get.js' );
const findVersion = require( './utils/findVersion.js' );
const makeLegalIdentifier = require( './utils/makeLegalIdentifier' );
const logger = require( './logger.js' );
const cache = require( './cache.js' );

const { root, tmpdir, registry } = require( '../config.js' );

function stringify ( query ) {
	const str = Object.keys( query ).sort().map( key => `${key}=${query[key]}` ).join( '&' );
	return str ? `?${str}` : '';
}

module.exports = function servePackage ( req, res, next ) {
	if ( req.method !== 'GET' ) return next();

	const match = /^\/(?:@([^\/]+)\/)?([^@\/]+)(?:@(.+?))?(?:\/(.+))?(?:\?(.+)?)$/.exec( req.url );

	if ( !match ) {
		// TODO make this prettier
		res.status( 400 );
		res.end( 'Invalid module ID' );
		return;
	}

	const user = match[1];
	const id = match[2];
	const tag = match[3] || 'latest';
	const deep = match[4];
	const queryString = match[5];

	const qualified = user ? `@${user}/${id}` : id;
	const query = ( queryString || '' )
		.split( '&' )
		.reduce( ( query, pair ) => {
			const [ key, value ] = pair.split( '=' );
			query[ key ] = value || true;
			return query;
		}, {} );

	get( `${registry}/${encodeURIComponent( qualified )}` ).then( JSON.parse )
		.then( meta => {
			if ( !meta.versions ) {
				logger.error( `[${qualified}] invalid module` );

				res.status( 400 );
				res.end( 'invalid module' );

				return;
			}

			const version = findVersion( meta, tag );

			if ( !semver.valid( version ) ) {
				logger.error( `[${qualified}] invalid tag` );

				res.status( 400 );
				res.end( 'invalid tag' );
				return;
			}

			if ( version !== tag ) {
				let url = `/${meta.name}@${version}`;
				if ( deep ) url += `/${deep}`;
				url += stringify( query );

				res.redirect( 302, url );
				return;
			}

			return fetchBundle( meta, tag, deep, query ).then( zipped => {
				logger.info( `[${qualified}] serving ${zipped.length} bytes` );
				res.status( 200 );
				res.set({
					'Content-Length': zipped.length,
					'Content-Type': 'application/javascript',
					'Content-Encoding': 'gzip',
					'Cache-Control': 'max-age=86400'
				});
				res.end( zipped );
			});
		})
		.catch( err => {
			logger.error( `[${qualified}] ${err.message}` );
			res.status( 500 );
			res.end( sander.readFileSync( `${root}/server/templates/500.html`, { encoding: 'utf-8' }) );
		});
};

const inProgress = {};

function fetchBundle ( pkg, version, deep, query ) {
	let hash = `${pkg.name}@${version}`;
	if ( deep ) hash += `_${deep.replace( /\//g, '_' )}`;
	hash += stringify( query );

	logger.info( `[${pkg.name}] requested package` );

	if ( cache.has( hash ) ) {
		logger.info( `[${pkg.name}] is cached` );
		return Promise.resolve( cache.get( hash ) );
	}

	if ( inProgress[ hash ] ) {
		logger.info( `[${pkg.name}] request was already in progress` );
	} else {
		logger.info( `[${pkg.name}] is not cached` );

		const dir = `${tmpdir}/${hash}`;
		const cwd = `${dir}/package`;

		function cleanup () {
			inProgress[ hash ] = null;
			sander.rimraf( dir ); // not returning this, no need to wait
		}

		inProgress[ hash ] = sander.mkdir( dir )
			.then( () => fetchAndExtract( pkg, version, dir ) )
			.then( () => sanitizePkg( cwd ) )
			.then( () => installDependencies( cwd ) )
			.then( () => bundle( cwd, deep, query ) )
			.then( code => {
				logger.info( `[${pkg.name}] minifying` );

				let zipped;

				try {
					const minified = UglifyJS.minify( code, { fromString: true }).code;
					zipped = zlib.gzipSync( minified );
				} catch ( err ) {
					logger.info( `[${pkg.name}] minification failed: ${err.message}` );
					zipped = zlib.gzipSync( code );
				}

				cache.set( hash, zipped );

				cleanup();
				return zipped;
			})
			.catch( err => {
				cleanup();
				throw err;
			});
	}

	return inProgress[ hash ];
}

function fetchAndExtract ( pkg, version, dir ) {
	const tarUrl = pkg.versions[ version ].dist.tarball;

	logger.info( `[${pkg.name}] fetching ${tarUrl}` );

	return new Promise( ( fulfil, reject ) => {
		let timedout = false;

		const timeout = setTimeout( () => {
			reject( new Error( 'Request timed out' ) );
			timedout = true;
		}, 10000 );

		const input = request( tarUrl );

		// don't like going via the filesystem, but piping into targz
		// was failing for some weird reason
		const intermediate = sander.createWriteStream( `${dir}/package.tgz` );

		input.pipe( intermediate );

		intermediate.on( 'close', () => {
			clearTimeout( timeout );

			if ( !timedout ) {
				logger.info( `[${pkg.name}] extracting to ${dir}/package` );
				targz().extract( `${dir}/package.tgz`, dir ).then( fulfil, reject );
			}
		});
	});
}

function sanitizePkg ( cwd ) {
	const pkg = require( `${cwd}/package.json` );
	pkg.scripts = {};
	return sander.writeFile( `${cwd}/package.json`, JSON.stringify( pkg, null, '  ' ) );
}

function exec ( cmd, cwd, pkg ) {
	return new Promise( ( fulfil, reject ) => {
		child_process.exec( cmd, { cwd }, ( err, stdout, stderr ) => {
			if ( err ) {
				return reject( err );
			}

			stdout.split( '\n' ).forEach( line => {
				logger.info( `[${pkg.name}] ${line}` );
			});

			stderr.split( '\n' ).forEach( line => {
				logger.info( `[${pkg.name}] ${line}` );
			});

			fulfil();
		});
	});
}

function installDependencies ( cwd ) {
	const pkg = require( `${cwd}/package.json` );
	logger.info( `[${pkg.name}] running yarn --production` );

	return exec( `${root}/node_modules/.bin/yarn --production`, cwd, pkg ).then( () => {
		if ( !pkg.peerDependencies ) return;

		return Object.keys( pkg.peerDependencies ).reduce( ( promise, name ) => {
			return promise.then( () => {
				logger.info( `[${pkg.name}] installing peer dependency ${name}` );
				const version = pkg.peerDependencies[ name ];
				return exec( `${root}/node_modules/.bin/yarn add ${name}@${version}`, cwd, pkg );
			});
		}, Promise.resolve() );
	});
}

function bundle ( cwd, deep, query ) {
	const pkg = require( `${cwd}/package.json` );
	const moduleName = query.name || makeLegalIdentifier( pkg.name );

	const entry = deep ?
		path.resolve( cwd, deep ) :
		findEntry( path.resolve( cwd, ( pkg.module || pkg[ 'jsnext:main' ] || pkg.main || 'index.js' ) ) );

	const code = sander.readFileSync( entry, { encoding: 'utf-8' });

	if ( isModule( code ) ) {
		logger.info( `[${pkg.name}] ES2015 module found, using Rollup` );
		return bundleWithRollup( cwd, pkg, entry, moduleName );
	} else {
		logger.info( `[${pkg.name}] No ES2015 module found, using Browserify` );
		return bundleWithBrowserify( pkg, entry, moduleName );
	}
}

function findEntry ( file ) {
	try {
		const stats = sander.statSync( file );
		if ( stats.isDirectory() ) return `${file}/index.js`;
		return file;
	} catch ( err ) {
		return `${file}.js`;
	}
}

function bundleWithRollup ( cwd, pkg, moduleEntry, moduleName ) {
	return rollup.rollup({
		entry: path.resolve( cwd, moduleEntry ),
		plugins: [
			resolve({ module: true, jsnext: true, main: false, modulesOnly: true })
		]
	}).then( bundle => {
		logger.info( `[${pkg.name}] bundled using Rollup` );

		if ( bundle.imports.length > 0 ) {
			logger.info( `[${pkg.name}] non-ES2015 dependencies found, handing off to Browserify` );

			const intermediate = `${cwd}/__intermediate.js`;
			return bundle.write({
				dest: intermediate,
				format: 'cjs'
			}).then( () => {
				return bundleWithBrowserify( pkg, intermediate, moduleName );
			});
		}

		else {
			return bundle.generate({
				format: 'umd',
				moduleName
			}).code;
		}
	});
}

function bundleWithBrowserify ( pkg, main, moduleName ) {
	const b = browserify( main, {
		standalone: moduleName
	});

	return new Promise( ( fulfil, reject ) => {
		b.bundle( ( err, buf ) => {
			if ( err ) {
				reject( err );
			} else {
				logger.info( `[${pkg.name}] bundled using Browserify` );
				fulfil( '' + buf );
			}
		});
	});
}