
L.GridLayer.MandelbrotGL = L.GridLayer.extend({

	// The vertex shader does pretty much nothing, as every render
	//   uses the same quadrilateral spanning the entire GL viewport
	//   coordinate space. The coordinates of the tile corners are
	//   passed through to the fragment shader.
	_vertexShader: "                                       \n\
	attribute vec2 aVertexPosition;                        \n\
	attribute highp vec3 aPlotPosition;                    \n\
	varying highp vec3 vPosition;                          \n\
	void main(void) {                                      \n\
		gl_Position = vec4(aVertexPosition, 1.0, 1.0);       \n\
		vPosition = aPlotPosition;                           \n\
	}                                                      \n\
	",

	// The fragment shader is where the magic happens. Based on 
	//   the coordinates of the four corners, it interpolates the 
	//   complex plane coordinates for every pixel to be rendered,
	//   and performs the calculations unsing 200 steps and a threshold
	//   of 10; then it maps the steps to a color using a hue scale.
	// The code is pretty much inspired by http://learningwebgl.com/lessons/example01/
	//
	// TODO: Implement double floating precision as per 
	//   https://www.thasler.com/blog/blog/glsl-part2-emu
	_fragmentShader: "                                          \n\
	#extension GL_ARB_gpu_shader_fp64 : enable                  \n\
	precision highp float;                                      \n\
	                                                            \n\
	varying highp vec3 vPosition;                               \n\
	                                                            \n\
	void main(void) {                                           \n\
	    float cx = vPosition.x;                                 \n\
	    float cy = vPosition.y;                                 \n\
	    float cz = vPosition.z;                                 \n\
	                                                            \n\
	    float hue;                                              \n\
	    float saturation;                                       \n\
	    float value;                                            \n\
	    float hueRound;                                         \n\
	    int hueIndex;                                           \n\
	    float f;                                                \n\
	    float p;                                                \n\
	    float q;                                                \n\
	    float t;                                                \n\
	                                                            \n\
	                                                            \n\
	    float x = 0.0;                                          \n\
	    float y = 0.0;                                          \n\
	    float tempX = 0.0;                                      \n\
	    int i = 0;                                              \n\
	    int m = 100 + int(cz) * 50;                             \n\
	    int runaway = 0;                                        \n\
	    for (int i=1; i < 200; i++) {                           \n\
	        tempX = x * x - y * y + float(cx);                  \n\
	        y = 2.0 * x * y + float(cy);                        \n\
	        x = tempX;                                          \n\
	        if (runaway == 0 && x * x + y * y > 100.0) {        \n\
	            runaway = i;                                    \n\
	            break;                                          \n\
	        }                                                   \n\
	    }                                                       \n\
	                                                            \n\
	    if (runaway != 0) {                                     \n\
	        hue = float(runaway) / 200.0;                       \n\
	        saturation = 0.6;                                   \n\
	        value = 1.0;                                        \n\
	                                                            \n\
	        hueRound = hue * 6.0;                               \n\
	        hueIndex = int(mod(float(int(hueRound)), 6.0));     \n\
	        f = fract(hueRound);                                \n\
	        p = value * (1.0 - saturation);                     \n\
	        q = value * (1.0 - f * saturation);                 \n\
	        t = value * (1.0 - (1.0 - f) * saturation);         \n\
	                                                            \n\
	        if (hueIndex == 0)                                  \n\
	            gl_FragColor = vec4(value, t, p, 1.0);          \n\
	        else if (hueIndex == 1)                             \n\
	            gl_FragColor = vec4(q, value, p, 1.0);          \n\
	        else if (hueIndex == 2)                             \n\
	            gl_FragColor = vec4(p, value, t, 1.0);          \n\
	        else if (hueIndex == 3)                             \n\
	            gl_FragColor = vec4(p, q, value, 1.0);          \n\
	        else if (hueIndex == 4)                             \n\
	            gl_FragColor = vec4(t, p, value, 1.0);          \n\
	        else if (hueIndex == 5)                             \n\
	            gl_FragColor = vec4(value, p, q, 1.0);          \n\
	                                                            \n\
	    } else {                                                \n\
	        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);            \n\
	    }                                                       \n\
	}                                                           \n\
	",

	options: {
		maxZoom: Infinity	// Yeah, baby!
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

		var program = gl.createProgram();
		var vertexShader   = gl.createShader(gl.VERTEX_SHADER);
		var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(vertexShader, this._vertexShader);
		gl.shaderSource(fragmentShader, this._fragmentShader);
		gl.compileShader(vertexShader);
		gl.compileShader(fragmentShader);
		if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
			alert(gl.getShaderInfoLog(vertexShader));
			return null;
		}
		if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
			alert(gl.getShaderInfoLog(fragmentShader));
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
	}

});


L.gridLayer.mandelbrotGL = function (options) {
	return new L.GridLayer.MandelbrotGL(options);
};
