# packd changelog

## 2.8.0

* Add `?format=esm` query parameter ([#102](https://github.com/Rich-Harris/packd/pull/102))

## 2.7.0

* Update Rollup to 1.0, replace Uglify with Terser ([#65](https://github.com/Rich-Harris/packd/pull/65))

## 2.6.1

* Add UTF8 header ([#36](https://github.com/Rich-Harris/packd/pull/36))

## 2.6.0

* Fix registry URL for scoped packages ([#35](https://github.com/Rich-Harris/packd/pull/35))

## 2.5.3

* Use `tar` module ([#34](https://github.com/Rich-Harris/packd/pull/34))

## 2.5.2

* Bump tag to trigger AWS deploy

## 2.5.1

* Don't try to spellcheck package names ([#29](https://github.com/Rich-Harris/packd/pull/29))

## 2.5.0

* Improve caching ([#26](https://github.com/Rich-Harris/packd/pull/26))

## 2.4.0

* Show error message on 500 page ([#24](https://github.com/Rich-Harris/packd/pull/24))

## 2.3.4

* Fix package-lock.json

## 2.3.3

* Move some `devDependencies` to `dependencies`, where they belong ([#20](https://github.com/Rich-Harris/packd/pull/20))

## 2.3.2

* Update to new Uglify API

## 2.3.1

* Use `pushState` instead of `replaceState` on `/`
* Update to new Rollup API

## 2.3.0

* Do bundling and minification in a child process ([#11](https://github.com/Rich-Harris/packd/issues/11))

## 2.2.1

* Only send `start` message if process is a fork

## 2.2.0

* Expose port ([#16](https://github.com/Rich-Harris/packd/pull/16))
* Fix UglifyJS dependency ([#16](https://github.com/Rich-Harris/packd/pull/16))
* Fix content type on `/_cache`

## 2.1.4

* Update rollup-plugin-node-resolve — fixes #6

## 2.1.3

* Fix queries with deep imports

## 2.1.2

* Fix query string parsing

## 2.1.1

* Fix bug with route matching regex

## 2.1.0

* Support semver ranges
* Add message encouraging package authors to use pkg.module

## 2.0.0

* Shorten URLs — `/bundle/foo` is now just `/foo`
* Move `/log` to `_log` (npm package names cannot start with underscores)
* Add `/_cache` route for inspecting the cache
* Filter logs by package name: `/_log?filter=left-pad`
* Include yarn output in logs
* Use `modulesOnly` option in rollup-plugin-node-resolve to increase reliability for packages that import CommonJS from ESM ([#2](https://github.com/Rich-Harris/packd/issues/2))
* Allow deep imports (e.g. `/lodash-es/range.js`)

## 1.1.0

* Handle packages with `peerDependencies`, e.g. react-dom ([#1](https://github.com/Rich-Harris/packd/issues/1))

## 1.0.4

* Timeout after 10 seconds

## 1.0.3

* Add a loading indicator
* Use favicon middleware

## 1.0.2

* Fix bug that was prevent certain tarballs from being extracted

## 1.0.1

* Serve unminified bundles if minification fails
* Update homepage to include version number and link
* Better server error messages

## 1.0.0

* First release