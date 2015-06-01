
// This file defines a hcl2rgb transformation, which is used by specific colour ramps.

#define M_PI 3.1415926535897932384626433832795
#define M_TAU 2.0 * M_PI


// D65 standard referent
#define lab_X 0.950470
#define lab_Y 1.0
#define lab_Z 1.088830

mat4 xyz2rgb = mat4( 3.2404542, -1.5371385, -0.4985314, 0.0,
                    -0.9692660,  1.8760108,  0.0415560, 0.0,
                     0.0556434, -0.2040259,  1.0572252, 0.0,
                     0.0,        0.0,        0.0,       1.0);

float lab2xyz(float n) {
	if (n > 0.00080817591) {// 0.206893034 / 256
		return pow(n, 3.0);
	} else {
		return (n - 0.0005387931) / 0.030418113;	// (x - 4/29) / 7.787037 but in [0..1] instead of [0..256]
	}
}

vec4 hcl2rgb(vec4 hclg) {
	float h = hclg[0];	// Hue
	float c = hclg[1];	// Chrominance
	float l = hclg[2];	// Lightness
	float alpha = hclg[3];	// Alpha

	// First, convert HCL to L*a*b colour space
	h *= M_TAU; // from 0..1 to 1..2*pi
	float a = cos(h) * c;
	float b = sin(h) * c;
	
	// L*a*b to XYZ
	float y = (l + 0.0625) / 0.453126;	// y = (l+16) / 116 but in [0..1] instead of [0..255]
	float x = y + (a / 1.953125);     	// x = y + (a/500) but in [0..1] instead of [0..255]
	float z = y - (b / 0.78125);      	// z = y - (b/200) but in [0..1] instead of [0..255]
	
	x = lab2xyz(x) * lab_X;
	y = lab2xyz(y) * lab_Y;
	z = lab2xyz(z) * lab_Z;
	
	// XYZ to RGB is a simple matrix operation.
	return vec4(x, y, z, alpha) * xyz2rgb;
}

