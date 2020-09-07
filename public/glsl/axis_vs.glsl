#version 300 es

in vec3 a_position;
out vec3 colorV;

uniform mat4 u_matrix;
uniform vec3 u_color;

void main(){
	colorV = u_color;
	gl_position = u_matrix * vec4(a_position, 1.0);
}