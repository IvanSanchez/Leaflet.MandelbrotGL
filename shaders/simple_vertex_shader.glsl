attribute vec2 aVertexPosition;
attribute highp vec3 aPlotPosition;
varying highp vec3 vPosition;
void main(void) {
	gl_Position = vec4(aVertexPosition, 1.0, 1.0);
	vPosition = aPlotPosition;
}