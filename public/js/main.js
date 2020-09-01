"use strict";
var dataset;

function parseOBJ(text) {
  // because indices are base 1 let's just fill in the 0th data
  const objPositions = [[0, 0, 0]];
  const objTexcoords = [[0, 0]];
  const objNormals = [[0, 0, 0]];

  // same order as `f` indices
  const objVertexData = [
    objPositions,
    objTexcoords,
    objNormals,
  ];

  // same order as `f` indices
  let webglVertexData = [
    [],   // positions
    [],   // texcoords
    [],   // normals
  ];

  function newGeometry() {
    // If there is an existing geometry and it's
    // not empty then start a new one.
    if (geometry && geometry.data.position.length) {
      geometry = undefined;
    }
    setGeometry();
  }

  function addVertex(vert) {
    const ptn = vert.split('/');
    ptn.forEach((objIndexStr, i) => {
      if (!objIndexStr) {
        return;
      }
      const objIndex = parseInt(objIndexStr);
      const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
      webglVertexData[i].push(...objVertexData[i][index]);
    });
  }

  const keywords = {
    v(parts) {
      objPositions.push(parts.map(parseFloat));
    },
    vn(parts) {
      objNormals.push(parts.map(parseFloat));
    },
    vt(parts) {
      // should check for missing v and extra w?
      objTexcoords.push(parts.map(parseFloat));
    },
    f(parts) {
      const numTriangles = parts.length - 2;
      for (let tri = 0; tri < numTriangles; ++tri) {
        addVertex(parts[0]);
        addVertex(parts[tri + 1]);
        addVertex(parts[tri + 2]);
      }
    },
  };

  const keywordRE = /(\w*)(?: )*(.*)/;
  const lines = text.split('\n');
  for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
    const line = lines[lineNo].trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    const m = keywordRE.exec(line);
    if (!m) {
      continue;
    }
    const [, keyword, unparsedArgs] = m;
    const parts = line.split(/\s+/).slice(1);
    const handler = keywords[keyword];
    if (!handler) {
      console.warn('unhandled keyword:', keyword);  // eslint-disable-line no-console
      continue;
    }
    handler(parts, unparsedArgs);
  }

  return {
    position: webglVertexData[0],
    texcoord: webglVertexData[1],
    normal: webglVertexData[2],
  };
}
async function main() {
    var xOffset = 0;
    var yOffset = -100;
    var zOffset = 0;

    var xMax = Math.max.apply(Math, dataset.map(function(o) { return o.x; }));
    var xMin = -Math.max.apply(Math, dataset.map(function(o) { return -o.x; }));
    var yMax = Math.max.apply(Math, dataset.map(function(o) { return o.y; }));
    var yMin = -Math.max.apply(Math, dataset.map(function(o) { return -o.y; }));
    var zMax = Math.max.apply(Math, dataset.map(function(o) { return o.z; }));
    var zMin = -Math.max.apply(Math, dataset.map(function(o) { return -o.z; }));
    const normalizedDataset = dataset.map(item => [xOffset + (item.x - xMin) / (xMax - xMin) * 100.0, yOffset + (item.y - yMin) / (yMax - yMin) * 100.0, zOffset + (item.z - zMin) / (zMax - zMin) * 100.0, 1.0]);

  function getCursorPosition(canvas, event, camera) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    //console.log("x: " + x + " y: " + y);
    var x1 = m44.division(m44.vectorMultiply([x,y,1.0,1],m44.inverse(camera.cameraMatrix)));
    var x2 = m44.division(m44.vectorMultiply([x,y,-1.0,1],m44.inverse(camera.cameraMatrix)));
    //console.log(x1);
    //console.log(x2);
    var minDistance = 10000;
    var minIndex = null;
    normalizedDataset.forEach(function(x0, index) {
      // console.log(x0);
      // var x0 = m44.namedVector2Array(item);
      var dist = m44.magnitude(m44.hadamard(m44.subtract(x2,x1),m44.subtract(x1,x0)))/m44.magnitude(m44.subtract(x2,x1));
      if (dist<minDistance){
        minDistance = dist;
        minIndex = index;
      }
      //if(index <= 1){
       // console.log(index,dist);
        //console.log(x0);
      //}
    });
    console.log(minDistance,minIndex, normalizedDataset[minIndex]);
  }

  var canvas = document.querySelector("#canvas");
  var gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }
  var camera = {cameraMatrix:null};
  console.log(camera)
  canvas.addEventListener('mousedown', function(e) {
      console.log("hi")
      getCursorPosition(canvas, e, camera)
  });

  // look up the divcontainer
  var divContainerElement = document.querySelector("#divcontainer");

  // make the divs
  var divs = []
  var textNodes = []
  for(var i=0; i<3; ++i){
    var div = document.createElement("div");
    // assign it a CSS class
    div.className = "floating-div";
    // make a text node for its content
    var textNode = document.createTextNode("");
    div.appendChild(textNode);
    textNodes.push(textNode);
    // add it to the divcontainer
    divContainerElement.appendChild(div);
    divs.push(div);
  }

  const vs = `
  attribute vec4 a_position;
  attribute vec3 a_normal;

  uniform mat4 u_projection;
  uniform mat4 u_view;
  uniform mat4 u_world;

  varying vec3 v_normal;

  void main() {
    gl_Position = u_projection * u_view * u_world * a_position;
    v_normal = mat3(u_world) * a_normal;
  }
  `;

  const fs = `
  precision mediump float;

  varying vec3 v_normal;

  uniform vec4 u_diffuse;
  uniform vec3 u_lightDirection;

  void main () {
    vec3 normal = normalize(v_normal);
    float fakeLight = dot(u_lightDirection, normal) * .5 + .5;
    gl_FragColor = vec4(u_diffuse.rgb * fakeLight, u_diffuse.a);
  }
  `;


  // compiles and links the shaders, looks up attribute and uniform locations
  const meshProgramInfo = webglUtils.createProgramInfo(gl, [vs, fs]);

  const response = await fetch('https://webglfundamentals.org/webgl/resources/models/cube/cube.obj');  
  const text = await response.text();
  const data = parseOBJ(text);
  const bufferInfo = webglUtils.createBufferInfoFromArrays(gl, data);

  const cameraTarget = [0, 0, 0];
  const cameraPosition = [0, 0, 4];
  const zNear = 0.0001;
  const zFar = 500000;
  function render(time, givenMatrix, pointClass) {
   
    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    const fieldOfViewRadians = degToRad(60);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projection = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    const up = [0, 1, 0];
    // Compute the camera's matrix using look at.
    const camera = m4.lookAt(cameraPosition, cameraTarget, up);
    // console.log("camera:", camera)

    // Make a view matrix from the camera matrix.
    const view = m4.inverse(camera);
    //console.log("view:",view, Object.prototype.toString.call(view));
    const sharedUniforms = {
      u_lightDirection: m4.normalize([-1, 3, 5]),
      u_view: view,
      u_projection: projection,
    };

    gl.useProgram(meshProgramInfo.program);

    // calls gl.uniform
    webglUtils.setUniforms(meshProgramInfo, sharedUniforms);

    // calls gl.bindBuffer, gl.enableVertexAttribArray, gl.vertexAttribPointer
    webglUtils.setBuffersAndAttributes(gl, meshProgramInfo, bufferInfo);

    switch (pointClass){
      case 0:
        var rgb = [0.0, 0.0, 1.0, 1.0];
        break
      case 1:
        var rgb = [0.0, 1.0, 0.0, 1.0];
        break
      case 2:
        var rgb = [1.0, 0.0, 0.0, 1.0];
        break
      default:
        var rgb = [1.0, 1.0, 1.0, 1.0];
    }

    // calls gl.uniform
    webglUtils.setUniforms(meshProgramInfo, {
      //u_world: m4.yRotation(time),
      u_world : givenMatrix,
      u_diffuse: rgb,
    });

    // calls gl.drawArrays or gl.drawElements
    webglUtils.drawBufferInfo(gl, bufferInfo);

    //requestAnimationFrame(render);
  }

  // setup GLSL program
  var program = webglUtils.createProgramFromScripts(gl, ["vertex-shader-3d", "fragment-shader-3d"]);

  // look up where the vertex data needs to go.
  var positionLocation = gl.getAttribLocation(program, "a_position");
  var colorLocation = gl.getAttribLocation(program, "a_color");

  // lookup uniforms
  var matrixLocation = gl.getUniformLocation(program, "u_matrix");

  var axisVertices = [
    0.0, 0.0, 0.0,
    0.0, 1.0, 0.0
  ];
  // Create an empty buffer object
  var axis_vertex_buffer = gl.createBuffer();
  // Bind appropriate array buffer to it
  gl.bindBuffer(gl.ARRAY_BUFFER, axis_vertex_buffer);    
  // Pass the vertex data to the buffer
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(axisVertices), gl.STATIC_DRAW);

  // Create a buffer to put positions in
  var positionBuffer = gl.createBuffer();
  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  // Put geometry data into buffer
  setGeometry(gl);

  // Create a buffer to put colors in
  var colorBuffer = gl.createBuffer();
  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = colorBuffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  // Put geometry data into buffer
  setColors(gl);

  function radToDeg(r) {
    return r * 180 / Math.PI;
  }

  function degToRad(d) {
    return d * Math.PI / 180;
  }

  var cameraAngleYRadians = degToRad(0);
  var cameraAngleZRadians = degToRad(0);
  var cameraAngleXRadians = degToRad(0);
  var cameraZoom = 0;
  var fieldOfViewRadians = degToRad(60);

  drawScene();

  // Setup a ui.
  //Y
  webglLessonsUI.setupSlider("#cameraYAngle", {value: radToDeg(cameraAngleYRadians), slide: updateCameraAngleY, min: -360, max: 360});
  function updateCameraAngleY(event, ui) {
    cameraAngleYRadians = degToRad(ui.value);
    drawScene();
  }
  webglLessonsUI.setupSlider("#cameraZAngle", {value: radToDeg(cameraAngleZRadians), slide: updateCameraAngleZ, min: -360, max: 360});
  function updateCameraAngleZ(event, ui) {
    cameraAngleZRadians = degToRad(ui.value);
    drawScene();
  }
  webglLessonsUI.setupSlider("#cameraXAngle", {value: radToDeg(cameraAngleXRadians), slide: updateCameraAngleX, min: -360, max: 360});
  function updateCameraAngleX(event, ui) {
    cameraAngleXRadians = degToRad(ui.value);
    drawScene();
  }
webglLessonsUI.setupSlider("#cameraZoom", {value: cameraZoom, slide: updateCameraZoom, min: -10, max: 10});
  function updateCameraZoom(event, ui) {
    cameraZoom = ui.value;
    drawScene();
  }

  // Draw the scene.
  function drawScene() {
    webglUtils.resizeCanvasToDisplaySize(gl.canvas);

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Clear the canvas AND the depth buffer.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Turn on culling. By default backfacing triangles
    // will be culled.
    gl.enable(gl.CULL_FACE);

    // Enable the depth buffer
    gl.enable(gl.DEPTH_TEST);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);

    // Turn on the position attribute
    gl.enableVertexAttribArray(positionLocation);

    // Bind the position buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 3;          // 3 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        positionLocation, size, type, normalize, stride, offset);

    // Turn on the color attribute
    gl.enableVertexAttribArray(colorLocation);

    // Bind the color buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);

    // Tell the attribute how to get data out of colorBuffer (ARRAY_BUFFER)
    var size = 3;                 // 3 components per iteration
    var type = gl.UNSIGNED_BYTE;  // the data is 8bit unsigned values
    var normalize = true;         // normalize the data (convert from 0-255 to 0-1)
    var stride = 0;               // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;               // start at the beginning of the buffer
    gl.vertexAttribPointer(
        colorLocation, size, type, normalize, stride, offset);


    var numFs = 1;
    var radius = 200;

    // Compute the projection matrix
    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    var zNear = 1;
    var zFar = 2000;
    var projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    // Compute a matrix for the camera
    var cameraMatrix = m4.yRotation(cameraAngleYRadians);
    cameraMatrix = m4.multiply(cameraMatrix, m4.xRotation(cameraAngleXRadians));
    cameraMatrix = m4.multiply(cameraMatrix, m4.zRotation(cameraAngleZRadians));
    cameraMatrix = m4.translate(cameraMatrix, 0, 0, radius * 1.5 - cameraZoom * radius * 1.5 / 10.0);
    // console.log("cameraMat:",cameraMatrix)
    camera.cameraMatrix =  cameraMatrix;
    // Make a view matrix from the camera matrix
    var viewMatrix = m4.inverse(cameraMatrix);

    // Compute a view projection matrix
    var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

    // main axis
    for (var ii = 0; ii < 1; ++ii) {
      // starting with the view projection matrix
      // compute a matrix for the F
      var matrix = m4.translate(viewProjectionMatrix, xOffset, yOffset, zOffset);

      // Set the matrix.
      gl.uniformMatrix4fv(matrixLocation, false, matrix);

      // Draw the geometry.
      //var primitiveType = gl.TRIANGLES;
      var primitiveType = gl.LINES;
      var offset = 0;
      var count = 3 * 2;
      gl.drawArrays(primitiveType, offset, count);
    }

    for (var ii = 0; ii < 3; ++ii) {
      // starting with the view projection matrix
      // compute a matrix for the F
      var clipspace = m4.translate(viewProjectionMatrix, xOffset, yOffset, zOffset);
      if(ii == 0)
        clipspace = m44.vectorMultiply([0, -100,  0, 1.0], clipspace);
      else if(ii == 1)
        clipspace = m44.vectorMultiply([0, 0,  -100, 1.0], clipspace);
      else
        clipspace = m44.vectorMultiply([100, 0,  0, 1.0], clipspace);

      // Set the matrix.
      gl.uniformMatrix4fv(matrixLocation, false, clipspace);

      // divide X and Y by W just like the GPU does.
    clipspace = m44.division(clipspace);

    // convert from clipspace to pixels
    var pixelX = (clipspace[0] *  0.5 + 0.5) * gl.canvas.width;
    var pixelY = (clipspace[1] * -0.5 + 0.5) * gl.canvas.height;

    // position the div
    divs[ii].style.left = Math.floor(pixelX) + "px";
    divs[ii].style.top  = Math.floor(pixelY) + "px";
    textNodes[ii].nodeValue = 'Text_'+ii;
    }

    normalizedDataset.forEach(function(item, index) {
      var matrix = m4.translate(viewProjectionMatrix, item[0], item[1], item[2]);
      gl.uniformMatrix4fv(matrixLocation, false, matrix);
      gl.drawArrays(gl.POINTS, 6, 1);
      requestAnimationFrame(function(time){render(time, matrix, dataset[index]['class'])});
    });
    

    for(var jj = 0; jj<3; ++jj){
      for (var ii = 1; ii < 6; ++ii) {
        if(jj == 0){
          var x = xOffset + ii * 20;
          var y = yOffset;
          var z = zOffset;
        } else if(jj == 1){
          var x = xOffset;
          var y = yOffset + ii * 20;
          var z = zOffset;
        } else {
          var x = xOffset;
          var y = yOffset;
          var z = zOffset + ii * 20;
        }
        // starting with the view projection matrix
        // compute a matrix for the F
        var matrix = m4.translate(viewProjectionMatrix, x, y, z);
        // Set the matrix.
        gl.uniformMatrix4fv(matrixLocation, false, matrix);
        // Draw the geometry.
        //var primitiveType = gl.TRIANGLES;
        var primitiveType = gl.LINES;
        var offset = jj * 2;
        var count = 2;
        gl.drawArrays(primitiveType, offset, count);
      }
      for (var ii = 1; ii < 6; ++ii) {
        if(jj == 0){
          var x = xOffset;
          var y = yOffset;
          var z = zOffset + ii * 20;
        } else if(jj == 1){
          var x = xOffset + ii * 20;
          var y = yOffset;
          var z = zOffset;
        } else {
          var x = xOffset;
          var y = yOffset + ii * 20;
          var z = zOffset;
        }
        // starting with the view projection matrix
        // compute a matrix for the F
        var matrix = m4.translate(viewProjectionMatrix, x, y, z);
        // Set the matrix.
        gl.uniformMatrix4fv(matrixLocation, false, matrix);
        // Draw the geometry.
        //var primitiveType = gl.TRIANGLES;
        var primitiveType = gl.LINES;
        var offset = jj * 2;
        var count = 2;
        gl.drawArrays(primitiveType, offset, count);
      }
    }

  }
}

// Fill the buffer with the values that define a letter 'F'.
function setGeometry(gl) {
  var positions = new Float32Array([
          // left column front
          0,   0,  0,
          0, -100,  0,
          0,   0,  0,
          0, 0,  -100,
          0, 0,  0,
          100,   0,  0,
          0, 0, 0
          ]);

  // Center the F around the origin and Flip it around. We do this because
  // we're in 3D now with and +Y is up where as before when we started with 2D
  // we had +Y as down.

  // We could do by changing all the values above but I'm lazy.
  // We could also do it with a matrix at draw time but you should
  // never do stuff at draw time if you can do it at init time.
  var matrix = m4.xRotation(Math.PI);
  matrix = m4.translate(matrix, -50, -75, -15);

  for (var ii = 0; ii < positions.length; ii += 3) {
    var vector = m44.vectorMultiply([positions[ii + 0], positions[ii + 1], positions[ii + 2], 1], matrix);
    positions[ii + 0] = vector[0];
    positions[ii + 1] = vector[1];
    positions[ii + 2] = vector[2];
  }

  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
}

// Fill the buffer with colors for the 'F'.
function setColors(gl) {
  gl.bufferData(
      gl.ARRAY_BUFFER,
      new Uint8Array([
          // left column front
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,

          // top rung front
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,

          // middle rung front
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,
        200,  70, 120,

          // left column back
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,

          // top rung back
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,

          // middle rung back
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,
        80, 70, 200,

          // top
        70, 200, 210,
        70, 200, 210,
        70, 200, 210,
        70, 200, 210,
        70, 200, 210,
        70, 200, 210,

          // top rung right
        200, 200, 70,
        200, 200, 70,
        200, 200, 70,
        200, 200, 70,
        200, 200, 70,
        200, 200, 70,

          // under top rung
        210, 100, 70,
        210, 100, 70,
        210, 100, 70,
        210, 100, 70,
        210, 100, 70,
        210, 100, 70,

          // between top rung and middle
        210, 160, 70,
        210, 160, 70,
        210, 160, 70,
        210, 160, 70,
        210, 160, 70,
        210, 160, 70,

          // top of middle rung
        70, 180, 210,
        70, 180, 210,
        70, 180, 210,
        70, 180, 210,
        70, 180, 210,
        70, 180, 210,

          // right of middle rung
        100, 70, 210,
        100, 70, 210,
        100, 70, 210,
        100, 70, 210,
        100, 70, 210,
        100, 70, 210,

          // bottom of middle rung.
        76, 210, 100,
        76, 210, 100,
        76, 210, 100,
        76, 210, 100,
        76, 210, 100,
        76, 210, 100,

          // right of bottom
        140, 210, 80,
        140, 210, 80,
        140, 210, 80,
        140, 210, 80,
        140, 210, 80,
        140, 210, 80,

          // bottom
        90, 130, 110,
        90, 130, 110,
        90, 130, 110,
        90, 130, 110,
        90, 130, 110,
        90, 130, 110,

          // left side
        160, 160, 220,
        160, 160, 220,
        160, 160, 220,
        160, 160, 220,
        160, 160, 220,
        160, 160, 220]),
      gl.STATIC_DRAW);
}
async function init(){
   var path = window.location.pathname;
    var page = path.split("/").pop();
    var baseDir = window.location.href.replace(page, '');
    var shadeDir = baseDir + "/glsl";
  //Load the dataset from the json
     
    await utils.get_json(baseDir+"../dataset"+"/data.json", function(jsonFile){
    dataset = jsonFile.values;
    });
    console.log(dataset);
  main();
}
window.onload = init;