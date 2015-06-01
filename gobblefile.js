// gobblefile.js
var gobble = require('gobble');
var fs = require('fs');
var esc = require('jsesc');



function fileToString(filename) {
	var payload = fs.readFileSync(filename).toString();

	/// TODO: Run glslmin here

	return esc(payload, {wrap: true});
}

var src = gobble('src').transform('replace', {
	replacements: {
		'simple_vertex_shader':       fileToString('shaders/simple_vertex_shader.glsl'),
		'fragment_shader_mandelbrot': fileToString('shaders/fragment_shader_mandelbrot.glsl'),
		'fragment_shader_hue_ramp':   fileToString('shaders/fragment_shader_hueramp.glsl'),
		'fragment_shader_blue_ramp':  fileToString('shaders/fragment_shader_blueramp.glsl'),
		'fragment_shader_zebra_ramp': fileToString('shaders/fragment_shader_zebra.glsl'),
		'fragment_shader_hcl':        fileToString('shaders/fragment_shader_hcl.glsl'),
		'fragment_shader_hcl_hue':    fileToString('shaders/fragment_shader_hcl_hueramp.glsl'),
		'fragment_shader_hcl_blue':   fileToString('shaders/fragment_shader_hcl_blueramp.glsl')
	}
});

module.exports = gobble([
	src,
	src.transform('uglifyjs', { ext: '.min.js' })
]);

