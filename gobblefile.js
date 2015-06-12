// gobblefile.js
var gobble = require('gobble');

// Roughly equal to gobble([GLSL→JS, nativeJS]).browserify(...)
var concatenatedJs = gobble([
	gobble('shaders').transform('gl2js', {
		format: 'string'
	}),
	gobble('src')
]).transform('include', {});

module.exports = gobble([
	concatenatedJs,
	concatenatedJs.transform('uglifyjs', { ext: '.min.js' })
]);

