#version 300 es

in vec3 a_position;

uniform mat4 u_matrix;

void main(){
	gl_position=u_matrix*vec4(a_position,1.);
}