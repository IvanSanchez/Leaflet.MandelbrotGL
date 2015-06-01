
void main(void) {
	int steps = 0;
	
	steps = fractal();

	if (steps > 0) {
		float hue    = float(steps) / 25.0;
		float light = 0.2 + float(steps) / 1000.0;
		float chroma = clamp(float(steps) / 300.0, 0.3, 0.7);
		
		gl_FragColor = hcl2rgb( vec4(hue, chroma, light, 1.0) );
	} else {
		gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
	}
}
