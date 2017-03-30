# packd

[Rollup](https://rollupjs.org) as a service (with a little help from [Browserify](http://browserify.org/)).

This is a simple app for generating UMD bundles of npm packages, similar to [browserify-cdn](https://github.com/jfhbrook/wzrd.in) aka [wzrd.in](https://wzrd.in/). I made it because wzrd.in sometimes goes offline, and I need its functionality for the [Svelte REPL](https://svelte.technology/repl). Unfortunately I couldn't get browserify-cdn to run on [now.sh](https://zeit.co/now), so I decided to roll my own.

And since I was *roll*ing my own, it made sense to use [Rollup](https://rollupjs.org). (Feel free to roll your eyes.) For npm packages that expose [`pkg.module`](https://github.com/rollup/rollup/wiki/pkg.module), such as the [D3 modules](https://github.com/d3) this means you get smaller, more efficient bundles than with browserify-cdn.

Since Rollup can't handle all of the CommonJS code on npm, packd will use Browserify (or a combination of Rollup and Browserify) where appropriate.


## Using packd

You can try a hosted version of packd at https://packd.now.sh. **This is not designed with production use in mind! Please host your own instance if you want to use packd for your own apps.**

Bundles can be accessed [like so](https://packd.now.sh/bundle/left-pad). Bear in mind that if a bundle isn't cached, it needs to be installed and built before it can be served, which may take a little while:

```
/bundle/[name]
```

You can specify a tag (e.g. 'latest') or a version (e.g. '1.2.3'):

```
/bundle/[name]@latest
```

If you're using these URLs with `<script>` tags, you may need to specify the module's name (i.e. the global variable name used to access it, corresponding to `moduleName` in Rollup and `standalone` in Browserify). packd will guess based on the module ID, but you may need to control it with the `name` query:

```
/bundle/underscore?name=_
```


## Hosting an instance

packd is a straightforward Express app — clone this repo, `npm install` (or `yarn install`), then `npm start`. To host on [now](https://zeit.co/now), simply `npm install -g now` and run `now`.



## Credits

Thanks to [James Halliday](https://github.com/substack) and [Joshua Holbrook](https://github.com/jfhbrook) for their work on Browserify and browserify-cdn, and [Zeit](https://zeit.co) for making such an easy to use hosting environment.



## License

[MIT](LICENSE)
