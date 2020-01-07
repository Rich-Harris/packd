# packd

[Rollup](https://rollupjs.org) as a service (with a little help from [Browserify](http://browserify.org/)).

* [bundle.run](https://bundle.run) — CDN
* [packd.now.sh](https://packd.now.sh) — demo instance

This is a simple app for generating UMD bundles of npm packages, similar to [browserify-cdn](https://github.com/jfhbrook/wzrd.in) aka [wzrd.in](https://wzrd.in/). I made it because wzrd.in sometimes goes offline, and I need its functionality for the [Svelte REPL](https://svelte.technology/repl). Unfortunately I couldn't get browserify-cdn to run on [now.sh](https://zeit.co/now), so I decided to roll my own.

And since I was *roll*ing my own, it made sense to use [Rollup](https://rollupjs.org). (Feel free to roll your eyes.) For npm packages that expose [`pkg.module`](https://github.com/rollup/rollup/wiki/pkg.module), such as the [D3 modules](https://github.com/d3), this means you get smaller, more efficient bundles than with browserify-cdn. packd also gzips the files it serves, typically resulting in much smaller requests.

Since Rollup can't handle all of the CommonJS code on npm, packd will use Browserify (or a combination of Rollup and Browserify) where appropriate.


## Using packd

You can try a hosted version of packd at https://bundle.run.

Bundles can be accessed [like so](https://bundle.run/left-pad). Bear in mind that if a bundle isn't cached, it needs to be installed and built before it can be served, which may take a little while:

```
/[name]
```

You can specify a tag (e.g. 'latest') or a version (e.g. '1.2.3'):

```
/[name]@latest
```

If you're using these URLs with `<script>` tags, you may need to specify the module's name (i.e. the global variable name used to access it, corresponding to `moduleName` in Rollup and `standalone` in Browserify). packd will guess based on the module ID, but you may need to control it with the `name` query:

```
/underscore?name=_
```

By default, Packd will generate a UMD bundle. In some cases, you can generate an ES module bundle instead, by appending `?format=esm`. This only works if the requested package, and all its dependents, are themselves distributed as ES modules.

```
/the-answer?format=esm
```


## Hosting an instance

packd is a straightforward Express app — clone this repo, `npm install` (or `yarn install`), then `npm start`. To host on [now](https://zeit.co/now), simply `npm install -g now` and run `now`.



## Is this like unpkg.com?

No. [unpkg.com](https://unpkg.com) is like a CDN for npm — it serves the actual files in npm packages. In a lot of cases that's perfect, but since some library authors don't include distributable bundles (tsk, tsk) it's not a general solution to the problem that packd addresses. Moreover, many npm package authors don't minify their code, whereas packd does.

It is, however, blazing fast and extremely reliable. If a distributable version of a dependency *is* on unpkg, you should always prefer that.



## Credits

Thanks to [James Halliday](https://github.com/substack) and [Joshua Holbrook](https://github.com/jfhbrook) for their work on Browserify and browserify-cdn, and [Zeit](https://zeit.co) for making such an easy to use hosting environment.



## License

[MIT](LICENSE)
