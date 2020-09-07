var gl;
var axisProgram;
var lambertProgram;
var pickingProgram;

function main() {

	//define common variables
	var mouseX = -1;
	var mouseY = -1;
	var isDragging = false;

	let lightColor = [1.0, 1.0, 1.0];

	var Rx = 35.26;
	var Ry = 45;

	//Get attributes and uniform locations
	var positionAttributeLocation = gl.getAttributeLocation(axisProgram, "a_position");
	var colorUniformLocation = gl.getUniformLocation(axisProgram, "u_color");
	var matrixUniformLocation = gl.getUniformLocation(axisProgram, "u_matrix");

	var a_lambertPosition = gl.getAttributeLocation(lambertProgram, "inPosition");
	var a_lambertNormal = gl.getAttributeLocation(lambertProgram, "inNormal");
	var u_lambertMatrix = gl.getUniformLocation(lambertProgram, "matrix");
	var u_lambertNormalMatrix = gl.getUniformLocation(lambertProgram, "nMatrix");
	var u_lambertLightDir = gl.getUniformLocation(lambertProgram, "lightDirection");
	var u_lambertLightColor = gl.getUniformLocation(lambertProgram, "lightColor");
	var u_lambertDiffColor = gl.getUniformLocation(lambertProgram, "mDiffColor");
	var u_lambertLightDirMatrix = gl.getUniformLocation(lambertProgram, "lightDirMatrix");
	var u_lambertEyePos = gl.getUniformLocation(lambertProgram, "eyePos");
	var u_lambertSpecularType = gl.getUniformLocation(lambertProgram, " specularType");
	var u_lambertSpecularColor = gl.getUniformLocation(lambertProgram, "specularColor");
	var u_lambertSpecShine = gl.getUniformLocation(lambertProgram, "SpecShine");
	var u_lambertToonThreshold = gl.getUniformLocation(lambertProgram, "SToonTh");
	var u_lambertAmbientType = gl.getUniformLocation(lambertProgram, "ambientType");
	var u_lambertAmbientDirection = gl.getUniformLocation(lambertProgram, "ambientDirection");
	var u_lambertAmbientLightColor = gl.getUniformLocation(lambertProgram, "ambientLightColor");
	var u_lambertAmbientLightLowColor = gl.getUniformLocation(lambertProgram, "ambientLightLowColor");


	var a_pickingPosition = gl.getAttributeLocation(pickingProgram, "a_position");
	var u_pickingId = gl.getUniformLocation(pickingProgram, "u_id");
	var u_pickingMatrix = gl.getUniformLocation(pickingProgram, "u_matrix");

	//Axis and grid buffers
	var axisPositionBuffer = gl.createBuffer();
	var gridPositionBuffer = gl.createBuffer();
	var pointPositionBuffer = gl.createBuffer();
	var normalBuffer = gl.createBuffer();
	var indexBuffer = gl.createBuffer();

	//enable depth test
	gl.enable(gl.DEPTH_TEST);


	/* ==================================================================================================
	/* create secondary framebuffer for object picking
	/* ================================================================================================*/

	//create texture to render
	const targetTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, targetTexture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	//create a depth render buffer
	const depthBuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);

	function setFramebufferAttachmentSizes(width, height) {
		gl.bindTexture(gl.TEXTURE_2D, targetTexture);

		//Define size and format of level 0 
		gl.textImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

		gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
		gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
	}

	// Create and bind the framebuffer
	const fb = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

	//Attach the testure as the first color attachment
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT, gl.TEXTURE_2D, targetTexture, 0);

	//Make a depth buffer and the same size as the targetTexture
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

	setFramebufferAttachmentSizes(gl.canvas.width, gl.canvas.height);


	/* ================================================================================================*/

	function getIdAtPosition(posX, posY) {
		if (posX < 0 || posY < 0 || posX > gl.canvas.width || posY > gl.canvas.height) return -1;

		gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

		const pixelX = posX * gl.canvas.width / gl.canvas.clientWidth;
		const pixelY = gl.canvas.height - posY * gl.canvas.height / gl.canvas.clientHeight - 1;

		const data = new Uint8Array(4);
		gl.readPixels(pixelX, pixelY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, data);

		return decodeId(data);
	}

	//Mouse events
	gl.canvas.addEventListener('click', (e) => {
		const rect = canvas.getBoundingClientRect();
		ui.select(getIdAtPosition(e.clientX - rect.left, e.clientY - rect.top));
	});

	gl.canvas.addEventListener('mousedown', e => {
		isDragging = true;
	});

	gl.canvas.addEventListener('mousemove', (e) => {
		const rect = canvas.getBoundingClientRect();
		let x = e.clientX - rect.left;
		let y = e.clientY - rect.top;

		if (isDragging) {
			let deltaX = mouseX - x;
			let deltaY = mouseY - y;

			Rx = Rx - 180 * deltaY / gl.canvas.width;
			Rx = Math.max(Rx, 0);
			Rx = Math.min(Rx, 90);

			Ry = Ry + 180 * deltaX / gl.canvas.height;
			Ry = Math.max(Ry, 0);
			Ry = Math.min(Ry, 90);
		}

		mouseX = x;
		mouseY = y;

		ui.hover(getIdAtPosition(x, y));
	});

	gl.canvas.addEventListener('mouseup', e => {
		isDragging = false;
	});

	gl.canvas.addEventListener('mouseout', e => {
		isDragging = false;
		mouseX = -1;
		mouseY = -1;
	});

	/* ======================================================================================================================= */

	function drawScene() {

		//UI and variables
		let zoom = ui.zoom();
		let shape = ui.shape();
		let selected = ui.selected();
		let colorByAxis = ui.colorByAxis();
		let shading = ui.shading();
		let selectedId = getIdAtPosition(mouseX, mouseY);
		let specular = ui.specular();
		let ambient = ui.ambient();
		let scale = ui.scale();

		// Define directional light
		let dirLightAlpha = -utils.degToRad(ui.dirLightAlpha());
		let dirLightBeta = -utils.degToRad(ui.dirLightBeta());
		let directionalLight = [
			Math.cos(dirLightAlpha) * Math.cos(dirLightBeta),
			Math.sin(dirLightAlpha),
			Math.cos(dirLightAlpha) * Math.sin(dirLightBeta)
		];


		let aspectRatio = gl.canvas.width * 1.0 / gl.canvas.height;

		let axisVertices = axis.getAxisVertices(Rx, Ry, true);
		let labelVertices = axis.getLabelVertices(Rx, Ry, true);
		let gridVertices = axis.getGridVertices();

		let data = model.data(axis._gridX + 1, axis._gridY + 1, axis._gridZ + 1);
		let mask = model.mask();
		let clustered = model.isClustered();

		let range = model.range(axis._gridX + 1, axis._gridY + 1, axis._gridZ + 1);

		// World, view, projection matrix
		// Let perspectiveMatrix = utils.MakePerspective(90, 1 = gl.canvas.width, gl.canvas.height ...)
		// Let viewMatrix = utils.MakeView(0, 0, 0.5, 0, 0);
		let perspectiveMatrix = utils.MakeIsometric(aspectRatio, -100, 100, Rx, Ry);
		let viewMatrix = utils.MakeView(0.0, 0.0, 0.0, 0.0);


		/* =================================================================================================================== */

		//clear canvas
		gl.useProgram(axisProgram);

		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
		gl.clearColor(1.0, 1.0, 1.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


		//Draw axis
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

		gl.bindBuffer(gl.ARRAY_BUFFER, axisPositionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(axisVertices.flat()), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(positionAttributeLocation);
		gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);


		let worldMatrix = utils.MakeWorld(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, zoom);
		let matrix = utils.multiplyMatrices(perspectiveMatrix, utils.multiplyMatrices(viewMatrix, worldMatrix));

		gl.uniformMatrix4fv(matrixUniformLocation, gl.FALSE, utils.transposeMatrix(matrix));
		gl.uniform3fv(colorUniformLocation, [0.0, 0.0, 0.0]);

		gl.drawArrays(gl.LINES, 0, axisVertices.length);


		//Draw labels
		ui.labels.x.forEach((label, i) => {
			setLabelX(label, i, range, labelVertices, matrix, gl.canvas.width, gl.canvas.height, Rx, Ry, zoom);
		});

		ui.labels.y.forEach((label, i) => {
			setLabelY(label, i, range, labelVertices, matrix, gl.canvas.width, gl.canvas.height, Rx, Ry, zoom);
		});

		ui.labels.z.forEach((label, i) => {
			setLabelZ(label, i, range, labelVertices, matrix, gl.canvas.width, gl.canvas.height, Rx, Ry, zoom);
		});


		//Draw Grid
		gl.bindBuffer(gl.ARRAY_BUFFER, gridPositionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new FLOAT32Array(gridVertices.flat()), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(positionAttributeLocation);
		gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

		gl.uniform3fv(colorUniformLocation, [0.8, 0.8, 0.8]);
		gl.drawArrays(gl.LINES, 0, gridVertices.length);


		/* ===================================================================================================================== */

		let worldMatrices = MakeWorld(data, zoom, scale);
		var vertices, normals, indices;

		if (shape == "cube") {
			vertices = cube_info.vertices.flat();
			normals = cube_info.normals.flat();
			indices = cube_info.indices;
		} else if (shape == "torus") {
			vertices = torus_info.vertices.flat();
			normals = torus_info.normals.flat();
			indices = torus_info.indices;
		} else if (shape == "cylinder") {
			vertices = cone_info.vertices.flat();
			normals = cone_info.normals.flat();
			indices = cone_info.indices;
		} else {
			vertices = sphere_info.vertices.flat();
			normals = sphere_info.normals.flat();
			indices = sphere_info.indices;
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, pointPositionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);


		worldMatrices.forEach((wm, id) => {

			// Don't draw if point is masked
			if (!mask[id]) {
				return;
			}

			let worldViewMatrix = utils.multiplyMatrices(viewMatrix, wm);
			let projectionMatrix = utils.multiplyMatrices(perspectiveMatrix, worldViewMatrix);
			let lightDirMatrix = utils.invertMatrix(utils.transposeMatrix(viewMatrix));
			let normalMatrix = utils.invertMatrix(utils.transposeMatrix(worldViewMatrix));


			//Draw data point to texture (for picking)
			gl.useProgram(pickinkProgram);

			gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
			gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

			gl.bindBuffer(gl.ARRAY_BUFFER, pointPositionBuffer);
			gl.enableVertexAttribArray(a_pickingPosition);
			gl.vertexAttribPointer(a_pickingPosition, 3, gl.FLOAT, false, 0, 0);

			gl.uniformMatrix4fv(u_pickingMatrix, gl.False, utils.transposeMatrix(projectionMatrix));
			gl.uniform4fv(u_pickingId, encodeId(id));

			gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);


			// Draw data point to canvas
			var color = [0, 0, 0];

			if (!selected.includes(id)) {
				color = getColorById(id, colorByAxis, clustered);
				if (id == selectedId) {
					let alpha = shading ? 0.6 : 0.4;
					color = color.map(component => alpha + component * (1 - alpha));
				}
			}

			if (shading) {
				// Lambert shading
				gl.useProgram(lambertProgram);

				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
				gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

				gl.bindBuffer(gl.ARRAY_BUFFER, pointPositionBuffer);
				gl.enableVertexAttribArray(a_lambertPosition);
				gl.vertexAttribPointer(a_lambertPosition, 3, gl.FLOAT, false, 0, 0);

				gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
				gl.enableVertexAttribArray(a_lambertNormal);
				gl.vertexAttribPointer(a_lambertNormal, 3, gl.FLOAT, false, 0, 0);

				gl.uniformMatrix4fv(u_lambertMatrix, gl.FALSE, utils.transposeMatrix(projectionMatrix));
				gl.uniformMatrix4fv(u_lambertNormalMatrix, gl.FALSE, utils.transposeMatrix(normalMatrix));
				gl.uniformMatrix4fv(u_lambertLightDirMatrix, gl.FALSE, utils.transposeMatrix(lightDirMatrix));

				gl.uniform3fv(u_lambertLightDir, directionalLight);
				gl.uniform3fv(u_lambertLightColor, lightColor);
				gl.uniform3fv(u_lambertDiffColor, color);

				gl.uniform3f(u_lambertEyePos, 0, 0, 0);

				// ------> Specular
				gl.uniform4fv(u_lambertSpecularColor, specular.color);
				gl.uniform1f(u_lambertSpecShine, specular.gamma);
				gl.uniform1f(u_lambertToonThreshold, specular.toon_th);

				if (specular.type == "phong") {
					gl.uniform4f(u_lambertSpecularType, 1.0, 0.0, 0.0, 0.0);
				} else if (specular.type == "phong-toon") {
					gl.uniform4f(u_lambertSpecularType, 0.0, 1.0, 0.0, 0.0);
				} else if (specular.type == "blinn") {
					gl.uniform4f(u_lambertSpecularType, 0.0, 0.0, 1.0, 0.0);
				} else if (specular.type == "blinn-toon") {
					gl.uniform4f(u_lambertSpecularType, 0.0, 0.0, 0.0, 1.0);
				} else {
					gl.uniform4f(u_lambertSpecularType, 0.0, 0.0, 0.0, 0.0);
				}

				//Ambient
				let t = utils.degToRad(ambient.theta);
				let p = utils.degToRad(ambient.phi);

				gl.uniform3f(u_lambertAmbientDirection, Math.sin(t) * Math.sin(p), Math.cos(t), Math.sin(t) * Math.cos(p));
				gl.uniform4fv(u_lambertAmbientLightColor, ambient.upper);
				gl.uniform4fv(u_lambertAmbientLightLowColor, ambient.lower);

				if (ambient.type == "ambient") {
					gl.uniform4f(u_lambertAmbientType, 1.0, 0.0, 0.0, 0.0);
				} else if (ambient.type == "hemispheric") {
					gl.uniform4f(u_lambertAmbientType, 0.0, 1.0, 0.0, 0.0);
				} else {
					gl.uniform4f(u_lambertAmbienType, 0.0, 0.0, 0.0, 0.0);
				}

			} else {
				// No shading
				gl.useProgram(axisProgram);

				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
				gl.viewport(0.0, 0.0, gl.canvas.width, gl.canvas.height);

				gl.bindBuffer(gl.ARRAY_BUFFER, pointPositionBuffer);
				gl.enableVertexAttribArray(positionAttributeLocation);
				gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

				gl.uniformMatrix4fv(matrixUniformLocation, gl.FALSE, utils.transposeMatrix(projectionMatrix));
				gl.uniform3fv(colorUniformLocation, color);
			}

			gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
		});

		window.requestAnimationFrame(drawScene);
	}

	drawScene();
}


function autoResizeCanvas(canvas) {
	const expandFullScreen = () => {
		canvas.width = $("#canvas").parent().width();
		canvas.height = $("#canvas").parent().height();
	};

	expandFullScreen();
	//Resize screen when the browser has triggered the resize event
	window.addEventListener('resize', expandFullScreen);
}


async function init() {
	var path = window.locations.pathname;
	var page = path.split("/").pop();

	baseDir = window.location.href.replace(page, '');
	shadeDir = baseDir + "shaders/";

	//Make canvas resize automatically
	var canvas = document.getElementById("canvas");
	autoResizeCanvas(canvas);

	gl = canvas.getContext("webgl2");
	if (!gl) {
		document.write("GL context not opened");
		return;
	}

	// Build shaders
	await utils.loadFiles([shadeDir + 'axis-vs.glsl', shadeDir + 'axis-fs.glsl'], function (shaderText) {
		var vertexShader = utils.createShader(gl, gl.VERTEX_SHADER, shaderText[0]);
		var fragmentShader = utils.createShader(gl, gl.FRAGMENT_SHADER, shaderText[1]);
		axisProgram = utils.createProgram(gl, vertexShader, fragmentShader);
	});

	await utils.loadFiles([shadeDir + 'lambert-vs.glsl', shadeDir + 'lambert-fs.glsl'], function (shaderText) {
		var vertexShader = utils.createShader(gl, gl.VERTEX_SHADER, shaderText[0]);
		var fragmentShader = utils.createShader(gl, gl.FRAGMENT_SHADER, shaderText[1]);
		axisProgram = utils.createProgram(gl, vertexShader, fragmentShader);
	});

	await utils.loadFiles([shadeDir + 'picking-vs.glsl', shadeDir + 'picking-fs.glsl'], function (shaderText) {
		var vertexShader = utils.createShader(gl, gl.VERTEX_SHADER, shaderText[0]);
		var fragmentShader = utils.createShader(gl, gl.FRAGMENT_SHADER, shaderText[1]);
		axisProgram = utils.createProgram(gl, vertexShader, fragmentShader);
	});

	main();
}

window.onload = init;
