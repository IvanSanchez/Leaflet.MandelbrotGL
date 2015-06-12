(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"@/Leaflet.GridLayer.MandelbrotGL.js":[function(require,module,exports){

L.GridLayer.MandelbrotGL = L.GridLayer.extend({

	// The vertex shader does pretty much nothing, as every render
	//   uses the same quadrilateral spanning the entire GL viewport
	//   coordinate space. The coordinates of the tile corners are
	//   passed through to the fragment shader.
	// Note that the source is in the shaders/ directory and will
	//   get included here with some gobblejs magic.
	_vertexShader: require('./simple_vertex_shader.js'),

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
	_fragMandelbrot:  require('./fragment_shader_mandelbrot.js'),
	_fragHueramp:     require('./fragment_shader_hueramp.js'),
	_fragBlueramp:    require('./fragment_shader_blueramp.js'),
	_fragZebra:       require('./fragment_shader_zebra.js'),
	_fragHcl:         require('./fragment_shader_hcl.js'),
	_fragHclHueramp:  require('./fragment_shader_hcl_hueramp.js'),
	_fragHclBlueramp: require('./fragment_shader_hcl_blueramp.js'),

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

},{"./fragment_shader_blueramp.js":"@/fragment_shader_blueramp.js","./fragment_shader_hcl.js":"@/fragment_shader_hcl.js","./fragment_shader_hcl_blueramp.js":"@/fragment_shader_hcl_blueramp.js","./fragment_shader_hcl_hueramp.js":"@/fragment_shader_hcl_hueramp.js","./fragment_shader_hueramp.js":"@/fragment_shader_hueramp.js","./fragment_shader_mandelbrot.js":"@/fragment_shader_mandelbrot.js","./fragment_shader_zebra.js":"@/fragment_shader_zebra.js","./simple_vertex_shader.js":"@/simple_vertex_shader.js"}],"@/fragment_shader_blueramp.js":[function(require,module,exports){
module.exports = 'void main(){int a=0;float b,c;a=fractal();if(a!=0){b=float(a)/1e2;c=b/2.;gl_FragColor=vec4(c,c,b,1);}else gl_FragColor=vec4(0,0,0,1);}';

},{}],"@/fragment_shader_hcl.js":[function(require,module,exports){
module.exports = 'mat4 a=mat4(3.2404542,-1.5371385,-.4985314,0,-.969266,1.8760108,.041556,0,.0556434,-.2040259,1.0572252,0,0,0,0,1);float lab2xyz(float b){if(b>.00080817591)return pow(b,3.);else return (b-.0005387931)/.030418113;}vec4 hcl2rgb(vec4 b){float c,d,e,f,g,h,i,j,k;c=b[0];d=b[1];e=b[2];f=b[3];c*=2.*3.141592653589793;g=cos(c)*d;h=sin(c)*d;i=(e+.0625)/.453126;j=i+g/1.953125;k=i-h/.78125;j=lab2xyz(j)*.95047;i=lab2xyz(i)*1.;k=lab2xyz(k)*1.08883;return vec4(j,i,k,f)*a;}';

},{}],"@/fragment_shader_hcl_blueramp.js":[function(require,module,exports){
module.exports = 'void main(){int b=0;b=fractal();if(b>0){float c,d,e;c=.7+float(b)/2e3;d=.15+float(b)/4e2;e=float(b)/2e2;gl_FragColor=hcl2rgb(vec4(c,e,d,1));}else gl_FragColor=vec4(0,0,0,1);}';

},{}],"@/fragment_shader_hcl_hueramp.js":[function(require,module,exports){
module.exports = 'void main(){int b=0;b=fractal();if(b>0){float c,d,e;c=float(b)/25.;d=.2+float(b)/1e3;e=clamp(float(b)/3e2,.3,.7);gl_FragColor=hcl2rgb(vec4(c,e,d,1));}else gl_FragColor=vec4(0,0,0,1);}';

},{}],"@/fragment_shader_hueramp.js":[function(require,module,exports){
module.exports = 'void main(){int b,g;b=0;float c,d,e,f,h,i,j,k;b=fractal();if(b!=0){c=float(b)/2e2;d=.6;e=1.;f=c*6.;g=int(mod(float(f),6.));h=fract(f);i=e*(1.-d);j=e*(1.-h*d);k=e*(1.-(1.-h)*d);if(g==0)gl_FragColor=vec4(e,k,i,1);else if(g==1)gl_FragColor=vec4(j,e,i,1);else if(g==2)gl_FragColor=vec4(i,e,k,1);else if(g==3)gl_FragColor=vec4(i,j,e,1);else if(g==4)gl_FragColor=vec4(k,i,e,1);else if(g==5)gl_FragColor=vec4(e,i,j,1);}else gl_FragColor=vec4(0,0,0,1);}';

},{}],"@/fragment_shader_mandelbrot.js":[function(require,module,exports){
module.exports = '#version 100\nprecision highp float;varying highp vec3 b;int fractal(){float c,d,e,f,g,h;c=b.x;d=b.y;e=b.z;f=0.;g=0.;h=0.;int i,j,k;i=0;j=100+int(e)*50;k=0;for(int i=1;i<200;i++){h=f*f-g*g+float(c);g=2.*f*g+float(d);f=h;if(k==0&&f*f+g*g>1e2){k=i;break;}}return k;}';

},{}],"@/fragment_shader_zebra.js":[function(require,module,exports){
module.exports = 'void main(){int c=0;c=fractal();if(c*2147483648/1073741824!=0)gl_FragColor=vec4(1);else gl_FragColor=vec4(0,0,0,1);}';

},{}],"@/simple_vertex_shader.js":[function(require,module,exports){
module.exports = 'attribute vec2 aVertexPosition;attribute highp vec3 aPlotPosition;varying highp vec3 b;void main(){gl_Position=vec4(aVertexPosition,1,1);b=aPlotPosition;}';

},{}]},{},["@/Leaflet.GridLayer.MandelbrotGL.js"])
//# sourceMappingURL=Leaflet.GridLayer.MandelbrotGL.js.map
