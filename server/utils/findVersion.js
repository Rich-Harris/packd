const semver = require('semver');

module.exports = function findVersion(meta, tag) {
	// already a valid version?
	if (semver.valid(tag)) return meta.versions[tag] && tag;

	// dist tag
	if (tag in meta['dist-tags']) return meta['dist-tags'][tag];

	// semver range
	return semver.maxSatisfying(Object.keys(meta.versions), tag);
};
