
void main(void) {
	int steps = 0;
	float hue;
	float saturation;
	float value;
	float hueRound;
	int hueIndex;
	float f;
	float p;
	float q;
	float t;
	
	steps = fractal();

	if (steps != 0) {
		hue = float(steps) / 200.0;
		saturation = 0.6;
		value = 1.0;

		hueRound = hue * 6.0;
		hueIndex = int(mod(float(int(hueRound)), 6.0));
		f = fract(hueRound);
		p = value * (1.0 - saturation);
		q = value * (1.0 - f * saturation);
		t = value * (1.0 - (1.0 - f) * saturation);

		if (hueIndex == 0)
			gl_FragColor = vec4(value, t, p, 1.0);
		else if (hueIndex == 1)
			gl_FragColor = vec4(q, value, p, 1.0);
		else if (hueIndex == 2)
			gl_FragColor = vec4(p, value, t, 1.0);
		else if (hueIndex == 3)
			gl_FragColor = vec4(p, q, value, 1.0);
		else if (hueIndex == 4)
			gl_FragColor = vec4(t, p, value, 1.0);
		else if (hueIndex == 5)
			gl_FragColor = vec4(value, p, q, 1.0);

	} else {
		gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
	}
}