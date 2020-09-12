#version 300 es

in vec3 position;

// matrix = projection * view * model
uniform mat4 matrix; 

void main() {
	gl_Position = matrix * vec4(position, 1.0);
}