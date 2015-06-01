#version 100

precision highp float;

varying highp vec3 vPosition;

int fractal(void) {
	float cx = vPosition.x;
	float cy = vPosition.y;
	float cz = vPosition.z;

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

	return runaway;
}