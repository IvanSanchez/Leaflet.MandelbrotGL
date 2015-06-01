
void main(void) {
	int steps = 0;
	float blue;
	float yellow;
	
	steps = fractal();

	if (steps != 0) {
		blue = float(steps) / 100.0;
		yellow = blue / 2.0;

		gl_FragColor = vec4(yellow, yellow, blue, 1.0);

	} else {
		gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
	}
}