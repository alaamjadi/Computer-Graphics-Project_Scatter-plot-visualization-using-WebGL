// Boring DOM stuff (doesn't need explanation)
let classFilterEl = document.querySelector( '#classFilter' );
let modelSelectEl = document.querySelector( '#modelSelect' );
let modelScaleEl = document.querySelector( '#modelScale' );
let ambientLightColorEl = document.querySelector( '#ambientLightColor' );
let ambientLightIntensityEl = document.querySelector( '#ambientLightIntensity' );
let dirLightColorEl = document.querySelector( '#dirLightColor' );
let dirLightIntensityEl = document.querySelector( '#dirLightIntensity' );
let dirLightPosXEl = document.querySelector( '#dirLightPosX' );
let dirLightPosYEl = document.querySelector( '#dirLightPosY' );
let dirLightPosZEl = document.querySelector( '#dirLightPosZ' );
let filterMinXEl = document.querySelector( '#filterMinX' );
let filterMinYEl = document.querySelector( '#filterMinY' );
let filterMinZEl = document.querySelector( '#filterMinZ' );
let filterMaxXEl = document.querySelector( '#filterMaxX' );
let filterMaxYEl = document.querySelector( '#filterMaxY' );
let filterMaxZEl = document.querySelector( '#filterMaxZ' );

filterMinXEl.oninput = function () { filterMin[ 0 ] = this.value; }
filterMinYEl.oninput = function () { filterMin[ 1 ] = this.value; }
filterMinZEl.oninput = function () { filterMin[ 2 ] = this.value; }

filterMaxXEl.oninput = function () { filterMax[ 0 ] = this.value; }
filterMaxYEl.oninput = function () { filterMax[ 1 ] = this.value; }
filterMaxZEl.oninput = function () { filterMax[ 2 ] = this.value; }

classFilterEl.oninput = function () {
	this.value == "All" ? classId = parseInt(-1):classId = parseInt( this.value );
}

modelSelectEl.oninput = function () {

	useCube = this.value == 1 ? true : false;

}

modelScaleEl.oninput = function () {

	modelScale = this.value;

}

ambientLightColorEl.oninput = function () {

	ambientLightColor[ 0 ] = parseInt( this.value.substr( 1, 2 ), 16 ) / 255;
	ambientLightColor[ 1 ] = parseInt( this.value.substr( 3, 2 ), 16 ) / 255;
	ambientLightColor[ 2 ] = parseInt( this.value.substr( 5, 2 ), 16 ) / 255;

}

ambientLightIntensityEl.oninput = function () {

	ambientLightIntensity = this.value;

}

dirLightColorEl.oninput = function () {

	dirLightColor[ 0 ] = parseInt( this.value.substr( 1, 2 ), 16 ) / 255;
	dirLightColor[ 1 ] = parseInt( this.value.substr( 3, 2 ), 16 ) / 255;
	dirLightColor[ 2 ] = parseInt( this.value.substr( 5, 2 ), 16 ) / 255;

}

dirLightIntensityEl.oninput = function () {

	dirLightIntensity = this.value;

}

dirLightPosXEl.oninput = function () { dirLightPos[ 0 ] = this.value; }
dirLightPosYEl.oninput = function () { dirLightPos[ 1 ] = this.value; }
dirLightPosZEl.oninput = function () { dirLightPos[ 2 ] = this.value; }
