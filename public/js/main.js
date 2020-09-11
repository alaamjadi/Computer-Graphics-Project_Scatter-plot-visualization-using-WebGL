// get the canvas element
let canvas = document.getElementById( 'my-canvas' );

// get the size of the canvas on the screen
let box = canvas.getBoundingClientRect();

// set the dimensions
canvas.width = box.width;
canvas.height = box.height;

// get webgl context
let gl = canvas.getContext( 'webgl2' );
if ( ! gl ) {
	throw new Error( 'Can\'t get webgl context.' );
}

// set the rendering area
gl.viewport( 0, 0, canvas.width, canvas.height );

// enable depth test
gl.enable( gl.DEPTH_TEST );

// enable back face removal for performance
//gl.enable( gl.CULL_FACE );

let program, attributes, uniforms;
let gridProgram, gridAttributes, gridUniforms;
let pickProgram, pickAttributes, pickUniforms;


// create a framebuffer for picking
let pickFramebuffer = gl.createFramebuffer();

// set it to the current fbo (framebuffer object)
gl.bindFramebuffer( gl.FRAMEBUFFER, pickFramebuffer );

// create a texture to render on for the fbo
let pickTexture = gl.createTexture();
gl.bindTexture( gl.TEXTURE_2D, pickTexture );
gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );

// allocate memory for the texture
gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null );

// link the texture to the fbo
gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pickTexture, 0 );

// create a renderbuffer for depth testing
let renderbuffer = gl.createRenderbuffer();
gl.bindRenderbuffer( gl.RENDERBUFFER, renderbuffer );

// allot the memory
gl.renderbufferStorage( gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvas.width, canvas.height );

// link it to fbo
gl.framebufferRenderbuffer( gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer );

// local object space transformation
let modelMatrix = mat4.create();

// inverted camea matrix
let viewMatrix = mat4.create();

// For projecting the points from camera space to clip space
let projectionMatrix = mat4.create();

// normal matrix = tranpose(inverse(modelMatrix)) for world space lighting
let normalMatrix = mat4.create();

// temporary matrix for positioning text elements on screen
let matrix = mat4.create();

// create the perspective projection matrix
mat4.perspective( projectionMatrix, Math.PI / 180 * 75, canvas.width / canvas.height, 0.1, 1000 );

// colors for classes, classes are consecutive whole numbers
let colors = [
	[ 1.0, 0, 0 ],
	[ 0, 1.0, 0 ],
	[ 0, 0, 1.0 ]
];

// classId for filtering points
let classId = - 1;

// flag to use cube model to render points
let useCube = false;


// selected point index in the normalizedData array
let selectedId = - 1;

// color to render selected points with
let selectedColor = [ 1.0, 1.0, 1.0 ];

// mix-max filtering
let filterMin = [ 0, 0, 0 ];
let filterMax = [ 1, 1, 1 ];

// ambient light
let ambientLightColor = [ 1.0, 1.0, 1.0 ];
let ambientLightIntensity = 0.4;

// Directional light
let dirLightColor = [ 1.0, 1.0, 1.0 ];
let dirLightIntensity = 0.6;
let dirLightPos = [ 10, 10, 10 ];

// scale of the grid/world
let scale = [ 1, 1, 1 ];

// scale of the points model
let modelScale = 0.02;

// camera properties
let cameraYaw = Math.PI / 4;
let cameraPitch = - Math.PI / 6;
let cameraDist = 3;
let zoomFactor = 0.9;
let rotateSpeed = 1;

// last position of the cursor
let pointStart = [ 0, 0 ];

// current position of the cursor
let pointEnd = [ 0, 0 ];

// is mouse button pressed?
let isPointerDown = false;

// did the cursor move after the mouse button was pressed?
let hasMoved = false;

// screen text, used for axis names and displaying coords
let textEl = document.createElement( 'div' );
textEl.style.position = 'absolute'
textEl.style.fontFamily = 'monospace';
textEl.style.top = 0;
textEl.style.left = 0;
textEl.style.color = 'red';
textEl.innerHTML = 'TEST';
textEl.whiteSpace = 'no-wrap';
textEl.style.transform = 'translate(-50%, -50%)';
document.body.appendChild( textEl );

// text element for x-axis
let xAxisEl = textEl.cloneNode();
xAxisEl.innerHTML = `X(0, ${scale[ 0 ]}, 0)`;
document.body.appendChild( xAxisEl );

// text element for y-axis
let yAxisEl = textEl.cloneNode();
yAxisEl.innerHTML = `Y(${scale[ 1 ]}, 0, 0)`;
document.body.appendChild( yAxisEl );

// text element for z-axis
let zAxisEl = textEl.cloneNode();
zAxisEl.innerHTML = `Z(0, 0, ${scale[ 2 ]})`;
document.body.appendChild( zAxisEl );



// zooming
window.addEventListener( 'mousewheel', function ( event ) {

	// affect the camera distance from the origin based on the direction wheel was rolled
	cameraDist *= Math.sign( event.deltaY ) === 1 ? 1 / zoomFactor : zoomFactor;

} );

canvas.addEventListener( 'mousedown', function ( event ) {

	// get the screen box and set the cursor position relative to the top-left corner of the 
	// canvas. In other words, no matter where the canvas is on the screen, the cursor
	// position will always be at (0, 0) at the top-left corner of the canvas
	let box = canvas.getBoundingClientRect();
	pointStart[ 0 ] = pointEnd[ 0 ] = event.clientX - box.left;
	pointStart[ 1 ] = pointEnd[ 1 ] = event.clientY - box.top;
	isPointerDown = true;

	// new click, reset the flag
	hasMoved = false;

} );

window.addEventListener( 'mousemove', function ( event ) {

	// cursor moved!
	hasMoved = true;

	// get relative cursor position
	let box = canvas.getBoundingClientRect();
	pointEnd[ 0 ] = event.clientX - box.left;
	pointEnd[ 1 ] = event.clientY - box.top;

	// if cursor is down update the rotations using the previous point
	if ( isPointerDown ) {
	
		cameraYaw -= ( pointEnd[ 0 ] - pointStart[ 0 ] ) * 0.002 * rotateSpeed;
		cameraPitch -= ( pointEnd[ 1 ] - pointStart[ 1 ] ) * 0.002 * rotateSpeed;

	}

	// set previous point to current point
	pointStart[ 0 ] = pointEnd[ 0 ];
	pointStart[ 1 ] = pointEnd[ 1 ];

} );

window.addEventListener( 'mouseup', function () {

	isPointerDown = false;

	// if the cursor didn't move, try to select point
	if ( ! hasMoved ) {

		// bind the pickFramebuffer to read its pixels
		gl.bindFramebuffer( gl.FRAMEBUFFER, pickFramebuffer );

		// where to store the pixls
		let pixel = new Uint8Array( 4 );

		// get the pixel at cursor's location
		// Note: In webgl, the Y=0 is the bottom, whereas in dom manipulation, Y=0 is the top,
		// so we have to invert the cursor's Y position. newY = (height - y)
		gl.readPixels( pointEnd[ 0 ], canvas.height - pointEnd[ 1 ], 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel );

		// if the alpha value for the pixel is not zero (aka something was rendered at that pixel), 
		// get the id of the object rendered there using decode(), else set to nothing selected
		selectedId = pixel[ 3 ] > 0 ? decode( pixel[ 0 ], normalizedData.length ) : - 1;

	}

} );

// gets index of the object and the total number of objects and generates a value between 0-1
// index / totalItems = output
function encode( i, n ) {

	return i / n;

}

// the color values are bytes (between 0 and 256), so we first make it between 0-1 and then scale 
// it by the total number of items and then round it off to get a valid index in the normalizedData 
// array
function decode( r, n ) {

	return Math.round( r / 255 * n );

}


// how any bars do we need?
let gridSegments = 5;

// vertex data for the grid
let gridPositions = [];

// generating the vertex data of the grid
for ( let x = 0; x <= gridSegments; x ++ ) {

	// between 0 and 1
	let dx = x / gridSegments;

	// grid for the XY-plane
	// first 3 pair = coords of startOfLine
	// second 3 pair = coords of endOfline
	gridPositions.push( 0, dx, 0,   1, dx, 0 );
	gridPositions.push( dx, 0, 0,   dx, 1, 0 );

	// grid for the YZ-plane
	gridPositions.push( 0, dx, 0,   0, dx, 1 );
	gridPositions.push( 0, 0, dx,   0, 1, dx );

	// grid for XZ-plane
	gridPositions.push( dx, 0, 0,   dx, 0, 1 );
	gridPositions.push( 0, 0, dx,   1, 0, dx );
	
}

// vertex buffer for grid positions
let gridPositionBuffer = gl.createBuffer();
gl.bindBuffer( gl.ARRAY_BUFFER, gridPositionBuffer );
gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( gridPositions ), gl.STATIC_DRAW );

// cube.obj buffers and number of vertices present in the mode (we need that for rendering)
let cubePositionBuffer, cubeNormalBuffer, cubeIndexBuffer, cubeVertexCount;

// sphere.obj buffers
let spherePositionBuffer, sphereNormalBuffer, sphereIndexBuffer, sphereVertexCount;

// parsed data with positions between 0 to scale
let normalizedData = [];

utils.loadFiles( [ 
	'/shaders/main_vert.glsl', '/shaders/main_frag.glsl', 
	'/shaders/grid_vert.glsl', '/shaders/grid_frag.glsl',
	'/shaders/pick_vert.glsl', '/shaders/pick_frag.glsl',
	'/obj/cube.obj', '/obj/sphere.obj', 'dataset/data.json' ], function ( result ) {

	// create main program and get its attributes and uniforms
	program = utils.createAndCompileShaders( gl, [ result[ 0 ], result[ 1 ] ] );
	attributes = utils.fetchAttributes( program );
	uniforms = utils.fetchUniforms( program );

	// create grid program and get its attributes and uniforms
	gridProgram = utils.createAndCompileShaders( gl, [ result[ 2 ], result[ 3 ] ] );
	gridUniforms = utils.fetchUniforms( gridProgram );
	gridAttributes = utils.fetchAttributes( gridProgram );

	// create pick program and get its attributes and uniforms
	pickProgram = utils.createAndCompileShaders( gl, [ result[ 4 ], result[ 5 ] ] );
	pickAttributes = utils.fetchAttributes( pickProgram );
	pickUniforms = utils.fetchUniforms( pickProgram );

	// parse cube.obj to get the vertex data
	let cubeData = utils.parseOBJ( result[ 6 ] );

	// position buffer
	cubePositionBuffer = gl.createBuffer();
	// set this buffer to be the current buffer
	gl.bindBuffer( gl.ARRAY_BUFFER, cubePositionBuffer );
	// set data to the buffer
	gl.bufferData( gl.ARRAY_BUFFER, cubeData.positionArray, gl.STATIC_DRAW );

	// same as above but for the normals (aka vectors perpendicular to the faces)
	cubeNormalBuffer = gl.createBuffer();
	gl.bindBuffer( gl.ARRAY_BUFFER, cubeNormalBuffer );
	gl.bufferData( gl.ARRAY_BUFFER, cubeData.normalArray, gl.STATIC_DRAW );

	// index buffer is a way to stop repition of same vertex dat aver and over again.
	// For example, for rendering a quad we need 2 triangles, and for rendering two 2 triangles
	// we need 6 vertices. By using index buffers, we can elliminate the need to use these two extra vertices.
	// We can have a vertex position buffer with 4 points and an index buffer with the indices of points to use 
	// to rneder the triangles. 
	cubeIndexBuffer = gl.createBuffer();
	gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer );
	gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, cubeData.indexArray, gl.STATIC_DRAW );

	// set the vertex count of the cube mesh
	cubeVertexCount = cubeData.indexArray.length;

	// Sae as above but for spheres

	let sphereData = utils.parseOBJ( result[ 7 ] );

	spherePositionBuffer = gl.createBuffer();
	gl.bindBuffer( gl.ARRAY_BUFFER, spherePositionBuffer );
	gl.bufferData( gl.ARRAY_BUFFER, sphereData.positionArray, gl.STATIC_DRAW );

	sphereNormalBuffer = gl.createBuffer();
	gl.bindBuffer( gl.ARRAY_BUFFER, sphereNormalBuffer );
	gl.bufferData( gl.ARRAY_BUFFER, sphereData.normalArray, gl.STATIC_DRAW );

	sphereIndexBuffer = gl.createBuffer();
	gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, sphereIndexBuffer );
	gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, sphereData.indexArray, gl.STATIC_DRAW );

	sphereVertexCount = sphereData.indexArray.length;

	// parse the dataset
	let parsed = JSON.parse( result[ 8 ] );

	// bounds of the data set
	let min = [ Infinity, Infinity, Infinity ];
	let max = [ - Infinity, - Infinity, - Infinity ];

	// compute the bounds
	for ( let i = 0; i < parsed.values.length; i ++ ) {

		var object = parsed.values[ i ];

		min[ 0 ] = Math.min( min[ 0 ], object.x );
		min[ 1 ] = Math.min( min[ 1 ], object.y );
		min[ 2 ] = Math.min( min[ 2 ], object.z );

		max[ 0 ] = Math.max( max[ 0 ], object.x );
		max[ 1 ] = Math.max( max[ 1 ], object.y );
		max[ 2 ] = Math.max( max[ 2 ], object.z );

	}


	//compute the size
	let size = [
		max[ 0 ] - min[ 0 ],
		max[ 1 ] - min[ 1 ],
		max[ 2 ] - min[ 2 ],
	];

	// normalize (make it between 0 and 1) the dataset and make it between 0 - scale
	for ( let i = 0; i < parsed.values.length; i ++ ) {

		let value = parsed.values[ i ];

		normalizedData.push( {
			class: value.class,
			position: [
				( value.x - min[ 0 ] ) / size[ 0 ] * scale[ 0 ],
				( value.y - min[ 1 ] ) / size[ 1 ] * scale[ 1 ],
				( value.z - min[ 2 ] ) / size[ 2 ] * scale[ 2 ]
			]
		} );

	}

	// start the animation loop
	drawScene();

} );

// rendering grid
function drawGrid() {

	// use the grid program
	gl.useProgram( gridProgram );

	// compute the model matrix
	// since the grid is at the origin, the matrix is an identity matrix
	mat4.identity( modelMatrix );

	// we now have to scale it to the size we set before
	mat4.scale( modelMatrix, modelMatrix, scale );

	// compute the modelViewMatrix
	mat4.multiply( matrix, viewMatrix, modelMatrix );

	// compute final matrix
	mat4.multiply( matrix, projectionMatrix, matrix );

	// load the matrix
	gl.uniformMatrix4fv( gridUniforms.matrix, false, matrix );

	// bind the gridPositionBuffer
	gl.bindBuffer( gl.ARRAY_BUFFER, gridPositionBuffer );

	// enable vertex attribute array for 'position' attribute
	gl.enableVertexAttribArray( gridAttributes.position );

	// point the attribute to the currently set buffer
	gl.vertexAttribPointer( gridAttributes.position, 3, gl.FLOAT, false, 0, 0 );

	// and finally render using the lines mode
	gl.drawArrays( gl.LINES, 0, gridPositions.length / 3 );

}

function drawScene( t ) {

	// clear the color on the screen and the depth information
	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

	// compute the camera matrix
	// for having that rotation effect, the order of transformation is this:
	// 1) rotate along Y axis
	// 2) rotate along X axis
	// 3) translate along the local z-axis 

	// reset transformations
	mat4.identity( viewMatrix );

	// step 1
	mat4.rotateY( viewMatrix, viewMatrix, cameraYaw );
	
	// step 2
	mat4.rotateX( viewMatrix, viewMatrix, cameraPitch );
	
	// step 3 
	mat4.translate( viewMatrix, viewMatrix, [ 0, 0, cameraDist ] );
	
	// we only calculated the camera matrix, we need to now invert it to 
	// get the view matrix
	mat4.invert( viewMatrix, viewMatrix );

	// set the default framebuffer as the current frambuffer
	// Note: if you don't do this, you wont see anything on the display
	gl.bindFramebuffer( gl.FRAMEBUFFER, null );
	
	// render grid
	drawGrid();

	// use the main program for rendering points
	gl.useProgram( program );

	// load the ambient light parameters
	gl.uniform3fv( uniforms.ambientLightColor, ambientLightColor );
	gl.uniform1f( uniforms.ambientLightIntensity, ambientLightIntensity );

	// load the directional light params
	gl.uniform3fv( uniforms.dirLightColor, dirLightColor );
	gl.uniform3fv( uniforms.dirLightPos, dirLightPos );
	gl.uniform1f( uniforms.dirLightIntensity, dirLightIntensity );

	// bind the position buffer according the 'useCube' flag and enable the vertex attributes
	gl.bindBuffer( gl.ARRAY_BUFFER, useCube ? cubePositionBuffer : spherePositionBuffer );
	gl.enableVertexAttribArray( attributes.position );
	gl.vertexAttribPointer( attributes.position, 3, gl.FLOAT, false, 0, 0 );

	gl.bindBuffer( gl.ARRAY_BUFFER, useCube ? cubeNormalBuffer : sphereNormalBuffer );
	gl.enableVertexAttribArray( attributes.normal );
	gl.vertexAttribPointer( attributes.normal, 3, gl.FLOAT, false, 0, 0 );

	// bind the index buffer according to the useCube flag
	gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, useCube ? cubeIndexBuffer : sphereIndexBuffer );


	// rendering all the points
	for ( let i = 0; i < normalizedData.length; i ++ ) {

		let object = normalizedData[ i ];

		// class filter check
		if ( classId > - 1 && object.class !== classId ) continue;

		// min-max filter check
		if ( object.position[ 0 ] < filterMin[ 0 ] || object.position[ 0 ] > filterMax[ 0 ] ||
			object.position[ 1 ] < filterMin[ 1 ] || object.position[ 1 ] > filterMax[ 1 ] ||
			object.position[ 2 ] < filterMin[ 2 ] || object.position[ 2 ] > filterMax[ 2 ] ) continue;

		// compute the model matrix
		mat4.identity( modelMatrix );

		// translate to the position of the point
		mat4.translate( modelMatrix, modelMatrix, object.position );
		
		// scale to the size specified
		mat4.scale( modelMatrix, modelMatrix, [ modelScale, modelScale, modelScale ] );

		// compute modelViewMatrix
		mat4.multiply( matrix, viewMatrix, modelMatrix );

		// comput final matrix
		mat4.multiply( matrix, projectionMatrix, matrix );

		// load into gpu
		gl.uniformMatrix4fv( uniforms.matrix, false, matrix );

		// compute normal matrix
		// normalMatrix = transpose( invert( Modelmatrix ) )
		mat4.invert( normalMatrix, modelMatrix );
		mat4.transpose( normalMatrix, normalMatrix );

		// load the normal matrix
		gl.uniformMatrix4fv( uniforms.normalMatrix, false, normalMatrix );

		// load model matrix
		gl.uniformMatrix4fv( uniforms.modelMatrix, false, modelMatrix );

		// check if the current point is the selected point. If it is, use selectedColor to render 
		// the point with, else use a color based on the class of the point.
		gl.uniform3fv( uniforms.color, i === selectedId ? selectedColor : colors[ object.class ] );

		// render the mesh using the appropiate vertex count
		gl.drawElements( gl.TRIANGLES, useCube ? cubeVertexCount : sphereVertexCount, gl.UNSIGNED_SHORT, 0 );

	}

	// For picking we have to render the scene to a fbo with each object rendered with an unique color.
	// This unique color acts as an identifier for the object. We can later read the pixels of this fbo at a 
	// certain position and find the object based on the color of the pixel.

	// bind the pickFramebuffer
	gl.bindFramebuffer( gl.FRAMEBUFFER, pickFramebuffer );

	// use the pick program
	gl.useProgram( pickProgram );

	// bind buffers and enable vertex attributes for pick program
	gl.bindBuffer( gl.ARRAY_BUFFER, useCube ? cubePositionBuffer : spherePositionBuffer );
	gl.enableVertexAttribArray( pickAttributes.position );
	gl.vertexAttribPointer( pickAttributes.position, 3, gl.FLOAT, false, 0, 0 );

	// bind the appropiate index buffer
	gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, useCube ? cubeIndexBuffer : sphereIndexBuffer );

	// render
	for ( let i = 0; i < normalizedData.length; i ++ ) {

		let object = normalizedData[ i ];

		// class filter check
		if ( classId > - 1 && object.class !== classId ) continue;

		// min-max filter check
		if ( object.position[ 0 ] < filterMin[ 0 ] || object.position[ 0 ] > filterMax[ 0 ] ||
			object.position[ 1 ] < filterMin[ 1 ] || object.position[ 1 ] > filterMax[ 1 ] ||
			object.position[ 2 ] < filterMin[ 2 ] || object.position[ 2 ] > filterMax[ 2 ] ) continue;

		// compute the matrices like bfore
		// but this time we don't need the normal matrix cos we are not doing any lighting
		// calculations this time. We are only rendering the objects with a single flat color
		// that acts as an identifier for the object
		mat4.identity( modelMatrix );
		mat4.translate( modelMatrix, modelMatrix, object.position );
		mat4.scale( modelMatrix, modelMatrix, [ modelScale, modelScale, modelScale ] );
		mat4.multiply( matrix, viewMatrix, modelMatrix );

		mat4.multiply( matrix, projectionMatrix, matrix );

		gl.uniformMatrix4fv( pickUniforms.matrix, false, matrix );

		// get the color value (the red component of the color is only needed)
		gl.uniform1f( pickUniforms.id, encode( i, normalizedData.length ) );

		// render
		gl.drawElements( gl.TRIANGLES, useCube ? cubeVertexCount : sphereVertexCount, gl.UNSIGNED_SHORT, 0 );

	}

	// compute a matrix that maps points from world space to clip space
	mat4.multiply( matrix, projectionMatrix, viewMatrix );

	// using that matrix, position these texts to their respective 
	// screen positions
	utils.setProjectedPosition( xAxisEl, [ scale[ 0 ], 0, 0 ] );
	utils.setProjectedPosition( yAxisEl, [ 0, scale[ 1 ], 0 ] );
	utils.setProjectedPosition( zAxisEl, [ 0, 0, scale[ 2 ] ] );

	// if some point is selected, show the coordEl and update its position
	if ( selectedId > - 1 ) {

		let p = normalizedData[ selectedId ].position;
		utils.setProjectedPosition( textEl, p );
		textEl.innerHTML = `(${p[ 0 ].toFixed(3)}, ${p[ 1 ].toFixed(3)}, ${p[ 2 ].toFixed(3)})`;
		textEl.style.display = '';

	} else { // else hide it

		textEl.style.display = 'none';

	}

	// for keeping the animation loop going
	window.requestAnimationFrame( drawScene );

}

async function init() {
	var path = window.location.pathname;
	var page = path.split("/").pop();

	baseDir = window.location.href.replace(page, '');
	shadeDir = baseDir + "glsl/";
	
	main();
}

window.onload = init;