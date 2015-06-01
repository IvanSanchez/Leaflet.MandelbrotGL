
L.GridLayer.MandelbrotGL = L.GridLayer.extend({

	// The vertex shader does pretty much nothing, as every render
	//   uses the same quadrilateral spanning the entire GL viewport
	//   coordinate space. The coordinates of the tile corners are
	//   passed through to the fragment shader.
	// Note that the source is in the shaders/ directory and will
	//   get included here with some gobblejs magic.
	_vertexShader: 'attribute vec2 aVertexPosition;\nattribute highp vec3 aPlotPosition;\nvarying highp vec3 vPosition;\nvoid main(void) {\n\tgl_Position = vec4(aVertexPosition, 1.0, 1.0);\n\tvPosition = aPlotPosition;\n}',

	// The fragment shader is where the magic happens. Based on 
	//   the coordinates of the four corners, it interpolates the 
	//   complex plane coordinates for every pixel to be rendered,
	//   and performs the calculations unsing 200 steps and a threshold
	//   of 10; then it maps the steps to a color using a hue scale.
	// The code is pretty much inspired by http://learningwebgl.com/lessons/example01/
	//
	// Note that the source is in the shaders/ directory and will
	//   get included here with some gobblejs magic.
	//
	// TODO: Implement double floating precision as per 
	//   https://www.thasler.com/blog/blog/glsl-part2-emu
	_fragmentShaderMandelbrot: '#version 100\n\nprecision highp float;\n\nvarying highp vec3 vPosition;\n\nint fractal(void) {\n\tfloat cx = vPosition.x;\n\tfloat cy = vPosition.y;\n\tfloat cz = vPosition.z;\n\n\tfloat x = 0.0;\n\tfloat y = 0.0;\n\tfloat tempX = 0.0;\n\tint i = 0;\n\tint m = 100 + int(cz) * 50;\n\tint runaway = 0;\n\tfor (int i=1; i < 200; i++) {\n\t\ttempX = x * x - y * y + float(cx);\n\t\ty = 2.0 * x * y + float(cy);\n\t\tx = tempX;\n\t\tif (runaway == 0 && x * x + y * y > 100.0) {\n\t\t\trunaway = i;\n\t\t\tbreak;\n\t\t}\n\t}\n\n\treturn runaway;\n}',
	_fragmentShaderHueRamp:    '\nvoid main(void) {\n\tint steps = 0;\n\tfloat hue;\n\tfloat saturation;\n\tfloat value;\n\tfloat hueRound;\n\tint hueIndex;\n\tfloat f;\n\tfloat p;\n\tfloat q;\n\tfloat t;\n\t\n\tsteps = fractal();\n\n\tif (steps != 0) {\n\t\thue = float(steps) / 200.0;\n\t\tsaturation = 0.6;\n\t\tvalue = 1.0;\n\n\t\thueRound = hue * 6.0;\n\t\thueIndex = int(mod(float(int(hueRound)), 6.0));\n\t\tf = fract(hueRound);\n\t\tp = value * (1.0 - saturation);\n\t\tq = value * (1.0 - f * saturation);\n\t\tt = value * (1.0 - (1.0 - f) * saturation);\n\n\t\tif (hueIndex == 0)\n\t\t\tgl_FragColor = vec4(value, t, p, 1.0);\n\t\telse if (hueIndex == 1)\n\t\t\tgl_FragColor = vec4(q, value, p, 1.0);\n\t\telse if (hueIndex == 2)\n\t\t\tgl_FragColor = vec4(p, value, t, 1.0);\n\t\telse if (hueIndex == 3)\n\t\t\tgl_FragColor = vec4(p, q, value, 1.0);\n\t\telse if (hueIndex == 4)\n\t\t\tgl_FragColor = vec4(t, p, value, 1.0);\n\t\telse if (hueIndex == 5)\n\t\t\tgl_FragColor = vec4(value, p, q, 1.0);\n\n\t} else {\n\t\tgl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);\n\t}\n}',
	_fragmentShaderBlueRamp:   '\nvoid main(void) {\n\tint steps = 0;\n\tfloat blue;\n\tfloat yellow;\n\t\n\tsteps = fractal();\n\n\tif (steps != 0) {\n\t\tblue = float(steps) / 100.0;\n\t\tyellow = blue / 2.0;\n\n\t\tgl_FragColor = vec4(yellow, yellow, blue, 1.0);\n\n\t} else {\n\t\tgl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);\n\t}\n}',
	_fragmentShaderZebraRamp:  '\n\nvoid main(void) {\n\tint steps = 0;\n\t\n\tsteps = fractal();\n\n\t// This is a *very* dirty way of doing modulo 2 operations.\n\t// Multiplying a 32-bit integer by 2^31 will effectively \n\t//   shift the integer 31 bits and drop the 31 most significant\n\t//   bits, leaving only the least significant one.\n\t// Then, divide the number by 2^30 to clear the overflow.\n\t\n\tif ((steps * 2147483648) / 1073741824 != 0) {\n\t\tgl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);\n\t} else {\n\t\tgl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);\n\t}\n}\n',
	_fragmentShaderHcl:        '\n// This file defines a hcl2rgb transformation, which is used by specific colour ramps.\n\n\n\n#define M_PI 3.1415926535897932384626433832795\n#define M_TAU 2.0 * M_PI\n\n\n// D65 standard referent\n#define lab_X 0.950470\n#define lab_Y 1.0\n#define lab_Z 1.088830\n\nmat4 xyz2rgb = mat4( 3.2404542, -1.5371385, -0.4985314, 0.0,\n                    -0.9692660,  1.8760108,  0.0415560, 0.0,\n                     0.0556434, -0.2040259,  1.0572252, 0.0,\n                     0.0,              0.0,              0.0,             1.0);\n\nfloat lab2xyz(float n) {\n\tif (n > 0.00080817591) {// 0.206893034 / 256\n\t\treturn pow(n, 3.0);\n\t} else {\n\t\treturn (n - 0.0005387931) / 0.030418113;\t// (x - 4/29) / 7.787037 but in [0..1] instead of [0..256]\n\t}\n}\n\nvec4 hcl2rgb(vec4 hclg) {\n\tfloat h = hclg[0];\t// Hue\n\tfloat c = hclg[1];\t// Chrominance\n\tfloat l = hclg[2];\t// Lightness\n\tfloat alpha = hclg[3];\t// Alpha\n\n\t// First, convert HCL to L*a*b colour space\n\th *= M_TAU; // from 0..1 to 1..2*pi\n\tfloat a = cos(h) * c;\n\tfloat b = sin(h) * c;\n\t\n\t// L*a*b to XYZ\n\tfloat y = (l + 0.0625) / 0.453126;\t// y = (l+16) / 116 but in [0..1] instead of [0..255]\n\tfloat x = y + (a / 1.953125);     \t// x = y + (a/500) but in [0..1] instead of [0..255]\n\tfloat z = y - (b / 0.78125);      \t// z = y - (b/200) but in [0..1] instead of [0..255]\n\t\n\tx = lab2xyz(x) * lab_X;\n\ty = lab2xyz(y) * lab_Y;\n\tz = lab2xyz(z) * lab_Z;\n\t\n\treturn vec4(x, y, z, alpha) * xyz2rgb;\n}\n\n',
	_fragmentShaderHclHue:     '\nvoid main(void) {\n\tint steps = 0;\n\t\n\tsteps = fractal();\n\n\tif (steps > 0) {\n\t\tfloat hue    = float(steps) / 25.0;\n\t\tfloat light = 0.2 + float(steps) / 1000.0;\n\t\tfloat chroma = clamp(float(steps) / 300.0, 0.3, 0.7);\n\t\t\n\t\tgl_FragColor = hcl2rgb( vec4(hue, chroma, light, 1.0) );\n\t} else {\n\t\tgl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);\n\t}\n}\n',
	_fragmentShaderHclBlue:    '\nvoid main(void) {\n\tint steps = 0;\n\t\n\tsteps = fractal();\n\n\tif (steps > 0) {\n\t\tfloat hue    = 0.7 + float(steps) / 2000.0;\n\t\tfloat light  = 0.15 + float(steps) / 400.0;\n\t\tfloat chroma = float(steps) / 200.0;\n\t\t\n\t\tgl_FragColor = hcl2rgb( vec4(hue, chroma, light, 1.0) );\n\t} else {\n\t\tgl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);\n\t}\n}\n',

	options: {
		maxZoom: 22,
		colorRamp: 'hue',
		fractal: 'mandelbrot'
	},

	
	// On instantiating the layer, it will initialize all the GL context
	//   and upload the shaders to the GPU, along with the vertex buffer
	//   (the vertices will stay the same for all tiles).
	initialize: function(options) {
		options = L.setOptions(this, options);

		this._renderer = L.DomUtil.create('canvas');
		this._renderer.width = this._renderer.height = this.options.tileSize;

		var gl = this._gl = this._renderer.getContext("experimental-webgl");
		gl.viewportWidth  = this.options.tileSize;
		gl.viewportHeight = this.options.tileSize;

		this._loadGLProgram()

		this._vertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
		var vertices = [
			 1.0,  1.0,
			-1.0,  1.0,
			 1.0, -1.0,
			-1.0, -1.0,
		];
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
		this._vertexBuffer.itemSize = 2;
		this._vertexBuffer.numItems = 4;

		gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
		gl.vertexAttribPointer(this._aVertexPosition, this._vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
	},

	
	_loadGLProgram: function(fractal, ramp) {
		var gl = this._gl;
		
		var colouringFragment = this._fragmentShaderHueRamp;	// Default
		if (this.options.colorRamp == 'blue') {
			colouringFragment = this._fragmentShaderBlueRamp;
		} else if (this.options.colorRamp == 'zebra') {
			colouringFragment = this._fragmentShaderZebraRamp;
		} else if (this.options.colorRamp == 'hclhue') {
			colouringFragment = this._fragmentShaderHcl + this._fragmentShaderHclHue;
		} else if (this.options.colorRamp == 'hclblue') {
			colouringFragment = this._fragmentShaderHcl + this._fragmentShaderHclBlue;
		}
		
		var fractalFragment = this._fragmentShaderMandelbrot;
		
		
		var program = gl.createProgram();
		var vertexShader   = gl.createShader(gl.VERTEX_SHADER);
		var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(vertexShader, this._vertexShader);
		gl.shaderSource(fragmentShader, fractalFragment + colouringFragment);
		gl.compileShader(vertexShader);
		gl.compileShader(fragmentShader);
		if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(vertexShader));
			return null;
		}
		if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(fragmentShader));
			return null;
		}
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);
		gl.useProgram(program);
		
		this._aVertexPosition = gl.getAttribLocation(program, "aVertexPosition");
		gl.enableVertexAttribArray(this._aVertexPosition);
		this._aPlotPosition = gl.getAttribLocation(program, "aPlotPosition");
		gl.enableVertexAttribArray(this._aPlotPosition);

		
	},
	
	
	// This is called once per tile - uses the layer's GL context to
	//   render a tile, passing the complex space coordinates to the
	//   GPU, and asking to render the vertexes (as triangles) again.
	// Every pixel will be opaque, so there is no need to clear the scene.
	_render: function(coords) {
		var gl = this._gl;

		// Calculate complex space coordinates of the corners...
		var cornerIx;
		corners = [];
		var baseCorners = [
			[ 0.5,  0.5],
			[-0.5,  0.5],
			[ 0.5, -0.5],
			[-0.5, -0.5],
		];
		var z = Math.pow(2, coords.z);

		var tileCenterX = (coords.x + 0.5 )/z;
		var tileCenterY = (coords.y + 0.5 )/z;

		for (cornerIx in baseCorners) {
			x = baseCorners[cornerIx][0];
			y = baseCorners[cornerIx][1];
			corners.push(x/z + tileCenterX);
			corners.push(y/z - tileCenterY);
			corners.push(z);
		}

		// ...upload them to the GPU...
		var plotPositionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, plotPositionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(corners), gl.STATIC_DRAW);
		gl.vertexAttribPointer(this._aPlotPosition, 3, gl.FLOAT, false, 0, 0);

		// ... and then the magic happens.
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		gl.deleteBuffer(plotPositionBuffer);
	},

	createTile: function (coords, done) {
		var tile = L.DomUtil.create('canvas', 'leaflet-tile');
		tile.width = tile.height = this.options.tileSize;
		tile.onselectstart = tile.onmousemove = L.Util.falseFn;

		var ctx = tile.getContext('2d');
		this._render(coords);
		ctx.drawImage(this._renderer, 0, 0);

		L.DomUtil.addClass(tile, 'leaflet-tile-loaded');

		return tile;
	},
	
	setColorRamp: function(ramp) {
		this.options.colorRamp = ramp;
		this._loadGLProgram();
		this.redraw();
	}

});


L.gridLayer.mandelbrotGL = function (options) {
	return new L.GridLayer.MandelbrotGL(options);
};
//# sourceMappingURL=Leaflet.GridLayer.MandelbrotGL.js.map
