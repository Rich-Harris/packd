module.exports = function padRight(str, num, char = ' ') {
	while (str.length < num) str += char;
	return str;
};
