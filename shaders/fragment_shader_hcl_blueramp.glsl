
void main(void) {
	int steps = 0;
	
	steps = fractal();

	if (steps > 0) {
		float hue    = 0.7 + float(steps) / 2000.0;
		float light  = 0.15 + float(steps) / 400.0;
		float chroma = float(steps) / 200.0;
		
		gl_FragColor = hcl2rgb( vec4(hue, chroma, light, 1.0) );
	} else {
		gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
	}
}
