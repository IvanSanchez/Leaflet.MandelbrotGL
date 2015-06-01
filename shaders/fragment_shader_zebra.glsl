

void main(void) {
	int steps = 0;
	
	steps = fractal();

	// This is a *very* dirty way of doing modulo 2 operations.
	// Multiplying a 32-bit integer by 2^31 will effectively 
	//   shift the integer 31 bits and drop the 31 most significant
	//   bits, leaving only the least significant one.
	// Then, divide the number by 2^30 to clear the overflow.
	
	if ((steps * 2147483648) / 1073741824 != 0) {
		gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
	} else {
		gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
	}
}
