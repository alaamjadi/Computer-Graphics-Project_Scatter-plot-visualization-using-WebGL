#version 300 es

// vertex attributes
in vec3 position; // vertex position
in vec3 normal; // vertex normal

out vec3 vNormal; // normal going into the fragment shader
out vec3 vPosition; // position going into the fragment shader

// matrices
uniform mat4 matrix;
uniform mat4 normalMatrix;
uniform mat4 modelMatrix;

void main() {
	// world space position
	vPosition = vec3(modelMatrix * vec4(position.xyz, 1.0));

	// transform the normal using the normal matrix and pass it on to the fragment shader
	vNormal = normalize(mat3(normalMatrix) * normal);

	// project the position;
	gl_Position = matrix * vec4(position, 1.0);
}