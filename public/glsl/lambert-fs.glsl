#version 300 es


precision mediump float;

in vec3 pos;
in vec3 fsNormal;
out vec4 outColor;

uniform vec3 mDiffColor;
uniform vec3 lightDirection;
uniform vec3 lightColor;
uniform mat4 lightDirMatrix;

uniform vec3 eyePos;

//specular
uniform vec4 specularType;
uniform vec4 specularColor;
uniform float SpecShine;
uniform float SToonTh;

//Ambient
uniform vec4 ambientType;
uniform vec3 ambientDirection;
uniform vec4 ambientLightColor;
uniform vec4 ambientLightLowColor;


vec4 compDiffuse(vec3 diffuseColor, vec3 lightColor, vec3 lightDirection, mat4 lightDirMatrix, vec3 normalVec){
	vec3 lambertColor = diffuseColor* lightColor * max(-dot(lightDirection,normalVec), 0.0);
	return vec4(lambertColor, 1.0);
}

vec4 compAmbient(vec4 ambientLightColor, vec4 ambientLightLowColor, vec3 ambientDirection, mat4 lightDirMatrix, vec3 noramlVec){
	vec4 ambColor = vec4(1.0,1.0,1.0,1.0);

	//Ambient
	vec4 ambientAmbient =  ambientLightColor * ambColor;

	//Hemispheric
	vec3 ADir = mat3(lightDirMatrix) * ambientDirection;
	float amBlend = (dot(normalVec, ADir) + 1.0)/2.0;
	vec4 ambientHemi = (ambientLightColor * amBlend + ambientLightLowColor * (1.0 - amBlend)) * ambColor;

	return ambientAmbient * ambientType.x + ambientHemi * ambientType.y;
}

vec4 compSpecular(vec3 lightDir, vec4 lightCol, vec3 normalVec, vec3 eyePos){
	vec3 eyedirVec = normalize (eyePos - pos);
	vec3 reflection = -reflect(lightDir, normalVec);
	vec3 halfVec = -normalize(lightDir + eyedirVec);

	//Phong
	vec4 specularPhong = lightCol * specularColor * pow(max(dot(reflection, eyedirVec), 0.0), SpecShine);

	//Toon Phong
	vec4 ToonSpecPCol;
	if(dot(reflection, eyedirVec) > SToonTh){
		ToonSpecPCol = specularColor;
	}
	else{
		ToonSpecPCol = vec4(0.0,0.0,0.0,1.0);
	}
	vec4 specularToonP = lightCol * ToonSpecPCol;

	//Blinn
	vec4 specularBlinn = lightCol * specularColor * pow(max(dot(normalVec, halfVec), 0.0), SpecShine);

	//ToonBlinn
	vec4 ToonSpecBCol;
	if(dot(normalVec, halfVec) > SToonTh){
	ToonSpecBCol = specularColor;
	}
	else{
	ToonSpecBCol = vec4(0.0,0.0,0.0,1.0);
	}
	vec4 specularToonB = lightCol * ToonSpecBCol;

	return 	specularPhong * specularType.x +
			specularToonP * specularType.y +
			specularBlinn * specularType.z +
			specularToonB * specularType.w;
}


void main(){
	vec3 nNormal = normalize(fsNormal);
	vec3 lDir = mat3(lightDirMatrix) * lightDirection;

	vec4 diffuse = compDiffuse(mDiffColor, lightColor, lDir, lightDirMatrix, nNormal);
	vec4 specular = compSpecular(lDir, vec4(lightColor, 1.0), nNormal, eyePos);
	vec4 ambient = compAmbient(ambientLightColor, ambientLightLowColor, ambientDirection, lightDirMatrix, nNormal);

	vec4 color = clamp(ambient + diffuse + specular, 0.0, 1.0);

	outColor = vec4(color.rgb, 1.0);
}