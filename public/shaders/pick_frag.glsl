#version 300 es

precision highp float;

uniform float id;

out vec4 finalColor;

void main() {

	finalColor = vec4( id );

}