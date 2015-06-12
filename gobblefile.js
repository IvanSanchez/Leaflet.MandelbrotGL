// gobblefile.js
var gobble = require('gobble');

// Roughly equal to gobble([GLSL→JS, nativeJS]).browserify(...)
var concatenatedJs = gobble([
	gobble('shaders').transform('gl2js', {
		format: 'module'
	}),
	gobble('src')
]).transform('browserify', {
	entries: 'Leaflet.GridLayer.MandelbrotGL.js',
	dest: 'Leaflet.GridLayer.MandelbrotGL.js'
});


// module.exports = concatenatedJs;

module.exports = gobble([
	concatenatedJs,
	concatenatedJs.transform('uglifyjs', { ext: '.min.js' })
]);

