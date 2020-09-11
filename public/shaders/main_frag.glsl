#version 300 es

precision highp float;

// incoming from vertex shader
in vec3 vNormal;
in vec3 vPosition;

// final color drawn on the canvas
out vec4 finalColor;

// color to render the model with
uniform vec3 color;

// directional light
uniform vec3 dirLightPos;
uniform vec3 dirLightColor;
uniform float dirLightIntensity;

// ambient light
uniform vec3 ambientLightColor;
uniform float ambientLightIntensity;

void main() {

	// calculate lambertian
	vec3 lightDir = normalize( dirLightPos - vNormal );
	vec3 lambertian = max( 0.0, dot( vNormal, lightDir ) ) * dirLightIntensity * dirLightColor;
	
	// ambient light
	vec3 ambient = ambientLightColor * ambientLightIntensity;

	// final light
	vec3 outgoingLight = lambertian + ambient;

	finalColor = vec4( color * outgoingLight, 1.0 );

}
