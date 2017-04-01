const http = require( 'http' );

module.exports = function get ( url ) {
	return new Promise( ( fulfil, reject ) => {
		http.get( url, response => {
			let body = '';

			response.on( 'data', chunk => {
				body += chunk;
			});

			response.on( 'end', () => {
				fulfil( body );
			});

			response.on( 'error', reject );
		});
	});
};