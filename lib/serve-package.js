const https = require( 'https' );
const path = require( 'path' );
const child_process = require( 'child_process' );
const targz = require( 'tar.gz' );
const sander = require( 'sander' );
const semver = require( 'semver' );
const request = require( 'request' );
const rollup = require( 'rollup' );
const resolve = require( 'rollup-plugin-node-resolve' );
const uglify = require( 'rollup-plugin-uglify' );
const get = require( './utils/get.js' );

const { root } = require( '../config.js' );

module.exports = function servePackage ( req, res ) {
	const { id } = req.params;

	Promise.all([
		get( `http://registry.npmjs.org/${id}` ).then( JSON.parse ),
		getLatestLocalVersion( id )
	]).then( ([ pkg, local ]) => {
		const latestVersion = pkg && pkg[ 'dist-tags' ] && pkg[ 'dist-tags' ].latest;

		if ( !latestVersion ) {
			// module doesn't exist?
			res.status( 400 );
			res.end( 'module not found' );
		}

		else {
			if ( !local || semver.gt( latestVersion, local ) ) {
				return fetchAndBundle( pkg ).then( () => {
					serveFile( res, `${root}/bundles/${id}/${latestVersion}.js` );
				});
			}

			else {
				serveFile( res, `${root}/bundles/${id}/${local}.js` );
			}
		}
	});
};

function serveFile ( res, file ) {
	res.writeHead( 200, {
		ContentType: 'application/javascript',
		CacheControl: 'max-age=86400' // one day (don't want to set this too high — a package's deps could change...)
	});
	sander.createReadStream( file ).pipe( res );
}

function getLatestLocalVersion ( id ) {
	return sander.stat( `${root}/bundles/${id}` )
		.then( stats => {
			if ( !stats.isDirectory() ) {
				return null;
			}

			return sander.readdir( `${root}/bundles/${id}` ).then( files => {
				files = files
					.map( file => file.replace( /\.js/, '' ) )
					.filter( semver.valid )
					.sort( ( a, b ) => {
						semver.gt( a, b ) ? 1 : -1;
					});

				return files[0];
			});
		})
		.catch( err => {
			console.log( `${id} does not exist locally (${err.message})` );
			return null;
		});
}

function fetchAndBundle ( pkg ) {
	const latestVersion = pkg[ 'dist-tags' ].latest;
	const tarUrl = pkg.versions[ latestVersion ].dist.tarball;

	const dir = `${root}/installed/node_modules/${pkg.name}`;

	return sander.mkdir( `${root}/.tmp/${pkg.name}` )
		.then( () => {
			return new Promise( ( fulfil, reject ) => {
				const stream = request( tarUrl ).pipe(
					targz({
						fromBase: true
					}).createWriteStream( `${root}/.tmp/${pkg.name}` )
				);

				stream.on( 'end', () => {
					sander
						.copydir( `${root}/.tmp/${pkg.name}/package` )
						.to( dir )
						.then( fulfil )
						.catch( reject );
				});

				stream.on( 'error', reject );
			});
		})
		.then( () => sander.rimraf( `${root}/.tmp/${pkg.name}` ) )
		.then( () => {
			const _pkg = require( `${dir}/package.json` );
			_pkg.scripts = {};
			return sander.writeFile( `${dir}/package.json`, JSON.stringify( _pkg, null, '  ' ) );
		})
		.then( () => {
			return new Promise( ( fulfil, reject ) => {
				child_process.exec( `npm install --production`, {
					cwd: `${dir}`
				}, ( err, stdout, stderr ) => {
					if ( err ) {
						return reject( err );
					}

					console.log( stdout );
					console.error( stderr );

					fulfil();
				});
			});
		})
		.then( () => {
			const _pkg = require( `${dir}/package.json` );
			if ( _pkg.module ) {
				return rollup.rollup({
					entry: path.resolve( dir, _pkg.module ),
					plugins: [
						resolve({ module: true, jsnext: true, main: false }),
						uglify()
					]
				}).then( bundle => {
					if ( bundle.imports.length > 0 ) {
						throw new Error( 'TODO second pass through browserify' );
					}

					else {
						return bundle.write({
							dest: `${root}/bundles/${_pkg.name}/${_pkg.version}.js`,
							format: 'umd',
							moduleName: 'TODO'
						});
					}
				});
			}
		});
}