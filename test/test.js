const { fork } = require('child_process');
const request = require('request-promise');
const { gunzipSync } = require('zlib');
const assert = require('assert');

const server = fork('server/index.js', ['start'], {
	stdio: 'inherit'
});

async function getPackage (id) {
	const zipped = await request(`http://localhost:9000/${id}`, {
		encoding: null
	});

	const source = gunzipSync(zipped).toString();

	const fn = new Function('module', 'exports', source);
	const mod = { exports: {} };
	fn(mod, mod.exports);

	return mod.exports;
}

function success (message) {
	console.log(`\u001B[32m✓\u001B[39m ${message}`);
}

server.on('message', async message => {
	if (message !== 'start') return;

	const leftPad = await getPackage('left-pad');
	assert.equal(leftPad('x', 3), '  x');

	const theAnswer = await getPackage('the-answer');
	assert.equal(theAnswer, 42);

	success('all tests pass');
	server.kill();
});