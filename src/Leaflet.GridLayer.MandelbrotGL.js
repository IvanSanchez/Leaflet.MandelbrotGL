
L.GridLayer.MandelbrotGL = L.GridLayer.extend({

	// The vertex shader does pretty much nothing, as every render
	//   uses the same quadrilateral spanning the entire GL viewport
	//   coordinate space. The coordinates of the tile corners are
	//   passed through to the fragment shader.
	// Note that the source is in the shaders/ directory and will
	//   get included here with some gobblejs magic.
	_vertexShader: include('simple_vertex_shader.js'),

	// The fragment shader is where the magic happens. Based on 
	//   the coordinates of the four corners, it interpolates the 
	//   complex plane coordinates for every pixel to be rendered,
	//   and performs the calculations unsing 200 steps and a threshold
	//   of 10; then it maps the steps to a color using a hue scale.
	// The code is pretty much inspired by http://learningwebgl.com/lessons/example01/
	//
	// The fragment shader can change in runtime, but we want to reuse some
	//   code (the mandelbrot code is the same for any colouring algorithm,
	//   as is the HCL→RGB functions), so the functions are in separate files.
	// These will be concatenated into a shader program in runtime.
	//
	// Note that the source is in the shaders/ directory and will
	//   get included here with some gobblejs magic.
	//
	// TODO: Implement double floating precision as per 
	//   https://www.thasler.com/blog/blog/glsl-part2-emu
	_fragMandelbrot:  include('fragment_shader_mandelbrot.js'),
	_fragHueramp:     include('fragment_shader_hueramp.js'),
	_fragBlueramp:    include('fragment_shader_blueramp.js'),
	_fragZebra:       include('fragment_shader_zebra.js'),
	_fragHcl:         include('fragment_shader_hcl.js'),
	_fragHclHueramp:  include('fragment_shader_hcl_hueramp.js'),
	_fragHclBlueramp: include('fragment_shader_hcl_blueramp.js'),

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
		
		var colouringFragment = this._fragHueramp;	// Default
		if (this.options.colorRamp == 'blue') {
			colouringFragment = this._fragBlueramp;
		} else if (this.options.colorRamp == 'zebra') {
			colouringFragment = this._fragZebra;
		} else if (this.options.colorRamp == 'hclhue') {
			colouringFragment = this._fragHcl + this._fragHclHueramp;
		} else if (this.options.colorRamp == 'hclblue') {
			colouringFragment = this._fragHcl + this._fragHclBlueramp;
		}
		
		var fractalFragment = this._fragMandelbrot;
		
		
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
