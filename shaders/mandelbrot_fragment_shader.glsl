#extension GL_ARB_gpu_shader_fp64 : enable
precision highp float;

varying highp vec3 vPosition;

void main(void) {
	float cx = vPosition.x;
	float cy = vPosition.y;
	float cz = vPosition.z;

	float hue;
	float saturation;
	float value;
	float hueRound;
	int hueIndex;
	float f;
	float p;
	float q;
	float t;


	float x = 0.0;
	float y = 0.0;
	float tempX = 0.0;
	int i = 0;
	int m = 100 + int(cz) * 50;
	int runaway = 0;
	for (int i=1; i < 200; i++) {
		tempX = x * x - y * y + float(cx);
		y = 2.0 * x * y + float(cy);
		x = tempX;
		if (runaway == 0 && x * x + y * y > 100.0) {
			runaway = i;
			break;
		}
	}

	if (runaway != 0) {
		hue = float(runaway) / 200.0;
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