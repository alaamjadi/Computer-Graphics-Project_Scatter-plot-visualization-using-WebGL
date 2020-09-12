#version 300 es

precision highp float;

uniform float id; // reference if for the object we are rendering

out vec4 outColor;

void main() {
	outColor = vec4(id);
}