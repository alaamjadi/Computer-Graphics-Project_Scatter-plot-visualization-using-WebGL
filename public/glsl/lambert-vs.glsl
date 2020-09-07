#version 300 es

in vec3 inPosition;
in vec3 inNormal;

out vec3 pos;
out vec3 fsNormal;

uniform mat4 matrix;
uniform mat4 nMatrix; //matrix to transform normal

void main(){
	pos = inPosition;
	/* pos = matrix * vec4(inPosition, 1.0); */
	fsNormal = mat3(nMatrix) * inNormal;
	gl_position = matrix * vec4(inPosition, 1.0);
}