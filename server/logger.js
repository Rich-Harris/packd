const fs = require('fs');
const minilog = require('minilog');

const { tmpdir } = require('../config.js');

minilog.enable();
minilog.pipe(fs.createWriteStream(`${tmpdir}/log`));

module.exports = minilog('packd');
