#version 300 es

precision mediimp float;

out vec4 outColor;

uniform vec4 u_id;

void main() {
    outColor = u_id;
}