var THREE = require('./three');
// File:examples/js/pmrem/PMREMGenerator.js

/**
 * @author Prashant Sharma / spidersharma03
 * @author Ben Houston / bhouston, https://clara.io
 *
 * To avoid cube map seams, I create an extra pixel around each face. This way when the cube map is
 * sampled by an application later(with a little care by sampling the centre of the texel), the extra 1 border
 *	of pixels makes sure that there is no seams artifacts present. This works perfectly for cubeUV format as
 *	well where the 6 faces can be arranged in any manner whatsoever.
 * Code in the beginning of fragment shader's main function does this job for a given resolution.
 *	Run Scene_PMREM_Test.html in the examples directory to see the sampling from the cube lods generated
 *	by this class.
 */

THREE.PMREMGenerator = function(sourceTexture, samplesPerLevel, resolution) {
  this.sourceTexture = sourceTexture;
  this.resolution = resolution !== undefined ? resolution : 256; // NODE: 256 is currently hard coded in the glsl code for performance reasons
  this.samplesPerLevel = samplesPerLevel !== undefined ? samplesPerLevel : 64;
  this.samplesPerLevel = Math.min(128, this.samplesPerLevel); // limit to 128 because that is the size of our poisson table.

  var monotonicEncoding =
    sourceTexture.encoding === THREE.LinearEncoding ||
    sourceTexture.encoding === THREE.GammaEncoding ||
    sourceTexture.encoding === THREE.sRGBEncoding;

  this.sourceTexture.minFilter = monotonicEncoding
    ? THREE.LinearFilter
    : THREE.NearestFilter;
  this.sourceTexture.magFilter = monotonicEncoding
    ? THREE.LinearFilter
    : THREE.NearestFilter;
  this.sourceTexture.generateMipmaps =
    this.sourceTexture.generateMipmaps && monotonicEncoding;

  this.cubeLods = [];

  var size = this.resolution;
  var params = {
    format: this.sourceTexture.format,
    magFilter: this.sourceTexture.magFilter,
    minFilter: this.sourceTexture.minFilter,
    type: this.sourceTexture.type,
    generateMipmaps: this.sourceTexture.generateMipmaps,
    anisotropy: this.sourceTexture.anisotropy,
    encoding: this.sourceTexture.encoding,
  };

  // how many LODs fit in the given CubeUV Texture.
  this.numLods = Math.log(size) / Math.log(2) - 2; // IE11 doesn't support Math.log2

  for (var i = 0; i < this.numLods; i++) {
    var renderTarget = new THREE.WebGLRenderTargetCube(size, size, params);
    renderTarget.texture.name = 'PMREMGenerator.cube' + i;
    this.cubeLods.push(renderTarget);
    size = Math.max(16, size / 2);
  }

  this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.0, 1000);

  this.shader = this.getShader();
  this.shader.defines['SAMPLES_PER_LEVEL'] = this.samplesPerLevel;
  this.planeMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2, 0),
    this.shader
  );
  this.planeMesh.material.side = THREE.DoubleSide;
  this.scene = new THREE.Scene();
  this.scene.add(this.planeMesh);
  this.scene.add(this.camera);

  this.shader.uniforms['envMap'].value = this.sourceTexture;
  this.shader.envMap = this.sourceTexture;
};

THREE.PMREMGenerator.prototype = {
  constructor: THREE.PMREMGenerator,

  /*
	 * Prashant Sharma / spidersharma03: More thought and work is needed here.
	 * Right now it's a kind of a hack to use the previously convolved map to convolve the current one.
	 * I tried to use the original map to convolve all the lods, but for many textures(specially the high frequency)
	 * even a high number of samples(1024) dosen't lead to satisfactory results.
	 * By using the previous convolved maps, a lower number of samples are generally sufficient(right now 32, which
	 * gives okay results unless we see the reflection very carefully, or zoom in too much), however the math
	 * goes wrong as the distribution function tries to sample a larger area than what it should be. So I simply scaled
	 * the roughness by 0.9(totally empirical) to try to visually match the original result.
	 * The condition "if(i <5)" is also an attemt to make the result match the original result.
	 * This method requires the most amount of thinking I guess. Here is a paper which we could try to implement in future::
	 * http://http.developer.nvidia.com/GPUGems3/gpugems3_ch20.html
	 */
  update: function(renderer) {
    this.shader.uniforms['envMap'].value = this.sourceTexture;
    this.shader.envMap = this.sourceTexture;

    var gammaInput = renderer.gammaInput;
    var gammaOutput = renderer.gammaOutput;
    var toneMapping = renderer.toneMapping;
    var toneMappingExposure = renderer.toneMappingExposure;

    renderer.toneMapping = THREE.LinearToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.gammaInput = false;
    renderer.gammaOutput = false;

    for (var i = 0; i < this.numLods; i++) {
      var r = i / (this.numLods - 1);
      this.shader.uniforms['roughness'].value = r * 0.95; // see comment above, pragmatic choice
      this.shader.uniforms['queryScale'].value.x = i == 0 ? -1 : 1;
      var size = this.cubeLods[i].width;
      this.shader.uniforms['mapSize'].value = size;
      this.renderToCubeMapTarget(renderer, this.cubeLods[i]);

      if (i < 5)
        this.shader.uniforms['envMap'].value = this.cubeLods[i].texture;
    }

    renderer.toneMapping = toneMapping;
    renderer.toneMappingExposure = toneMappingExposure;
    renderer.gammaInput = gammaInput;
    renderer.gammaOutput = gammaOutput;
  },

  renderToCubeMapTarget: function(renderer, renderTarget) {
    for (var i = 0; i < 6; i++) {
      this.renderToCubeMapTargetFace(renderer, renderTarget, i);
    }
  },

  renderToCubeMapTargetFace: function(renderer, renderTarget, faceIndex) {
    renderTarget.activeCubeFace = faceIndex;
    this.shader.uniforms['faceIndex'].value = faceIndex;
    this.shader.uniforms['seed'].value = Math.random();
    renderer.render(this.scene, this.camera, renderTarget, true);
  },

  getShader: function() {
    return new THREE.ShaderMaterial({
      defines: {
        SAMPLES_PER_LEVEL: 20,
      },

      uniforms: {
        faceIndex: { value: 0 },
        roughness: { value: 0.5 },
        mapSize: { value: 0.5 },
        envMap: { value: null },
        queryScale: { value: new THREE.Vector3(1, 1, 1) },
        testColor: { value: new THREE.Vector3(1, 1, 1) },
        seed: { value: 0.0 },
      },

      vertexShader:
        'varying vec2 vUv;\n\
				void main() {\n\
					vUv = uv;\n\
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\
				}',

      fragmentShader:
        'precision highp float;\n\
				#include <common>\n\
				varying vec2 vUv;\n\
				uniform int faceIndex;\n\
				uniform float roughness;\n\
				uniform samplerCube envMap;\n\
				uniform float mapSize;\n\
				uniform vec3 testColor;\n\
				uniform vec3 queryScale;\n\
				uniform float seed;\n\
				float poissonLine[128];\n\
				void initPoissonTable()	{\n\
					poissonLine[0] = 0.68999;\n\
					poissonLine[1] = 0.45883;\n\
					poissonLine[2] = 0.1408;\n\
					poissonLine[3] = 0.58453;\n\
					poissonLine[4] = 0.02776;\n\
					poissonLine[5] = 0.3657;\n\
					poissonLine[6] = 0.05616;\n\
					poissonLine[7] = 0.22111;\n\
					poissonLine[8] = 0.16301;\n\
					poissonLine[9] = 0.7939;\n\
					poissonLine[10] = 0.94334;\n\
					poissonLine[11] = 0.93425;\n\
					poissonLine[12] = 0.87263;\n\
					poissonLine[13] = 0.73582;\n\
					poissonLine[14] = 0.12286;\n\
					poissonLine[15] = 0.26529;\n\
					poissonLine[16] = 0.72647;\n\
					poissonLine[17] = 0.83657;\n\
					poissonLine[18] = 0.96543;\n\
					poissonLine[19] = 0.32305;\n\
					poissonLine[20] = 0.25021;\n\
					poissonLine[21] = 0.58689;\n\
					poissonLine[22] = 0.41629;\n\
					poissonLine[23] = 0.12616;\n\
					poissonLine[24] = 0.91421;\n\
					poissonLine[25] = 0.52287;\n\
					poissonLine[26] = 0.20964;\n\
					poissonLine[27] = 0.17271;\n\
					poissonLine[28] = 0.84766;\n\
					poissonLine[29] = 0.0022;\n\
					poissonLine[30] = 0.40568;\n\
					poissonLine[31] = 0.04687;\n\
					poissonLine[32] = 0.11933;\n\
					poissonLine[33] = 0.67212;\n\
					poissonLine[34] = 0.18933;\n\
					poissonLine[35] = 0.86945;\n\
					poissonLine[36] = 0.52297;\n\
					poissonLine[37] = 0.84475;\n\
					poissonLine[38] = 0.74494;\n\
					poissonLine[39] = 0.02533;\n\
					poissonLine[40] = 0.6232;\n\
					poissonLine[41] = 0.96762;\n\
					poissonLine[42] = 0.00449;\n\
					poissonLine[43] = 0.7535;\n\
					poissonLine[44] = 0.48421;\n\
					poissonLine[45] = 0.07936;\n\
					poissonLine[46] = 0.84871;\n\
					poissonLine[47] = 0.47694;\n\
					poissonLine[48] = 0.22845;\n\
					poissonLine[49] = 0.37711;\n\
					poissonLine[50] = 0.49824;\n\
					poissonLine[51] = 0.35694;\n\
					poissonLine[52] = 0.38277;\n\
					poissonLine[53] = 0.83666;\n\
					poissonLine[54] = 0.57835;\n\
					poissonLine[55] = 0.49536;\n\
					poissonLine[56] = 0.0132;\n\
					poissonLine[57] = 0.4593;\n\
					poissonLine[58] = 0.3938;\n\
					poissonLine[59] = 0.61267;\n\
					poissonLine[60] = 0.47573;\n\
					poissonLine[61] = 0.2202;\n\
					poissonLine[62] = 0.11283;\n\
					poissonLine[63] = 0.04534;\n\
					poissonLine[64] = 0.30502;\n\
					poissonLine[65] = 0.40026;\n\
					poissonLine[66] = 0.30118;\n\
					poissonLine[67] = 0.73927;\n\
					poissonLine[68] = 0.82648;\n\
					poissonLine[69] = 0.19517;\n\
					poissonLine[70] = 0.20144;\n\
					poissonLine[71] = 0.72373;\n\
					poissonLine[72] = 0.77945;\n\
					poissonLine[73] = 0.37953;\n\
					poissonLine[74] = 0.67661;\n\
					poissonLine[75] = 0.13671;\n\
					poissonLine[76] = 0.22514;\n\
					poissonLine[77] = 0.45704;\n\
					poissonLine[78] = 0.44605;\n\
					poissonLine[79] = 0.8856;\n\
					poissonLine[80] = 0.88545;\n\
					poissonLine[81] = 0.32133;\n\
					poissonLine[82] = 0.66175;\n\
					poissonLine[83] = 0.01964;\n\
					poissonLine[84] = 0.14848;\n\
					poissonLine[85] = 0.37481;\n\
					poissonLine[86] = 0.39741;\n\
					poissonLine[87] = 0.2039;\n\
					poissonLine[88] = 0.50282;\n\
					poissonLine[89] = 0.00156;\n\
					poissonLine[90] = 0.69715;\n\
					poissonLine[91] = 0.71233;\n\
					poissonLine[92] = 0.76777;\n\
					poissonLine[93] = 0.90509;\n\
					poissonLine[94] = 0.19425;\n\
					poissonLine[95] = 0.64406;\n\
					poissonLine[96] = 0.06155;\n\
					poissonLine[97] = 0.60422;\n\
					poissonLine[98] = 0.65107;\n\
					poissonLine[99] = 0.52872;\n\
					poissonLine[100] = 0.481;\n\
					poissonLine[101] = 0.95757;\n\
					poissonLine[102] = 0.53635;\n\
					poissonLine[103] = 0.42727;\n\
					poissonLine[104] = 0.91034;\n\
					poissonLine[105] = 0.24529;\n\
					poissonLine[106] = 0.75649;\n\
					poissonLine[107] = 0.13242;\n\
					poissonLine[108] = 0.75987;\n\
					poissonLine[109] = 0.62928;\n\
					poissonLine[110] = 0.84537;\n\
					poissonLine[111] = 0.95954;\n\
					poissonLine[112] = 0.47203;\n\
					poissonLine[113] = 0.6294;\n\
					poissonLine[114] = 0.67411;\n\
					poissonLine[115] = 0.89943;\n\
					poissonLine[116] = 0.77134;\n\
					poissonLine[117] = 0.77034;\n\
					poissonLine[118] = 0.46964;\n\
					poissonLine[119] = 0.78511;\n\
					poissonLine[120] = 0.74841;\n\
					poissonLine[121] = 0.51348;\n\
					poissonLine[122] = 0.58248;\n\
					poissonLine[123] = 0.00892;\n\
					poissonLine[124] = 0.89159;\n\
					poissonLine[125] = 0.14869;\n\
					poissonLine[126] = 0.39455;\n\
					poissonLine[127] = 0.75754;\n\
				}\n\
				\n\
				vec3 ImportanceSampleGGX( float radians, float radius, mat3 vecSpace, float roughness )\n\
				{\n\
					float rad = radius * roughness;\n\
					float up = sqrt( max( 1.0 - pow2( rad ), 0.0001 ) );\n\
					return vecSpace * vec3 (rad * cos( radians ), rad * sin( radians ), up );\n\
				}\n\
				mat3 matrixFromVector(vec3 n) {\n\
					float a = 1.0 / (1.0 + n.z);\n\
					float b = -n.x * n.y * a;\n\
					vec3 b1 = vec3(1.0 - n.x * n.x * a, b, -n.x);\n\
					vec3 b2 = vec3(b, 1.0 - n.y * n.y * a, -n.y);\n\
					return mat3(b1, b2, n);\n\
				}\n\
				\n\
				float unitToRadians( float unit ) { return PI * 2.0 * unit; }\n\
				\n\
				void main() {\n\
					initPoissonTable();\n\
					vec3 sampleDirection;\n\
					vec2 uv = vUv*2.0 - 1.0;\n\
					float offset = -1.0/mapSize;\n\
					const float a = -1.0;\n\
					const float b = 1.0;\n\
					float c = -1.0 + offset;\n\
					float d = 1.0 - offset;\n\
					float bminusa = b - a;\n\
					uv.x = (uv.x - a)/bminusa * d - (uv.x - b)/bminusa * c;\n\
					uv.y = (uv.y - a)/bminusa * d - (uv.y - b)/bminusa * c;\n\
					if (faceIndex==0) {\n\
						sampleDirection = vec3(1.0, -uv.y, -uv.x);\n\
					} else if (faceIndex==1) {\n\
						sampleDirection = vec3(-1.0, -uv.y, uv.x);\n\
					} else if (faceIndex==2) {\n\
						sampleDirection = vec3(uv.x, 1.0, uv.y);\n\
					} else if (faceIndex==3) {\n\
						sampleDirection = vec3(uv.x, -1.0, -uv.y);\n\
					} else if (faceIndex==4) {\n\
						sampleDirection = vec3(uv.x, -uv.y, 1.0);\n\
					} else {\n\
						sampleDirection = vec3(-uv.x, -uv.y, -1.0);\n\
					}\n\
					mat3 vecSpace = matrixFromVector(normalize(sampleDirection * queryScale));\n\
					vec3 rgbColor = vec3(0.0);\n\
					const int NumSamples = SAMPLES_PER_LEVEL;\n\
					vec3 direction;\n\
					float invNumSamples = 1.0 / float(NumSamples);\n\
					for( int i = 0; i < NumSamples; i ++ ) {\n\
						float unit = ( float(i) ) * invNumSamples;\n\
						float angle = unitToRadians( unit + 0.5 );\n\
						float radius = poissonLine[ i ];\n\
						direction = ImportanceSampleGGX( angle, radius, vecSpace, roughness);\n\
						vec3 color = envMapTexelToLinear(textureCube(envMap,direction)).rgb;\n\
						rgbColor.rgb += color;\n\
					}\n\
					rgbColor *= invNumSamples;\n\
					//rgbColor = testColorMap( roughness ).rgb;\n\
					gl_FragColor = linearToOutputTexel( vec4( rgbColor, 1.0 ) );\n\
				}',
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.ZeroFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.ZeroFactor,
      blendEquation: THREE.AddEquation,
    });
  },
};

// File:examples/js/pmrem/PMREMCubeUVPacker.js

/**
 * @author Prashant Sharma / spidersharma03
 * @author Ben Houston / bhouston, https://clara.io
 *
 * This class takes the cube lods(corresponding to different roughness values), and creates a single cubeUV
 * Texture. The format for a given roughness set of faces is simply::
 * +X+Y+Z
 * -X-Y-Z
 * For every roughness a mip map chain is also saved, which is essential to remove the texture artifacts due to
 * minification.
 * Right now for every face a PlaneMesh is drawn, which leads to a lot of geometry draw calls, but can be replaced
 * later by drawing a single buffer and by sending the appropriate faceIndex via vertex attributes.
 * The arrangement of the faces is fixed, as assuming this arrangement, the sampling function has been written.
 */

THREE.PMREMCubeUVPacker = function(cubeTextureLods, numLods) {
  this.cubeLods = cubeTextureLods;
  this.numLods = numLods;
  var size = cubeTextureLods[0].width * 4;

  var sourceTexture = cubeTextureLods[0].texture;
  var params = {
    format: sourceTexture.format,
    magFilter: sourceTexture.magFilter,
    minFilter: sourceTexture.minFilter,
    type: sourceTexture.type,
    generateMipmaps: sourceTexture.generateMipmaps,
    anisotropy: sourceTexture.anisotropy,
    encoding:
      sourceTexture.encoding === THREE.RGBEEncoding
        ? THREE.RGBM16Encoding
        : sourceTexture.encoding,
  };

  if (params.encoding === THREE.RGBM16Encoding) {
    params.magFilter = THREE.LinearFilter;
    params.minFilter = THREE.LinearFilter;
  }

  this.CubeUVRenderTarget = new THREE.WebGLRenderTarget(size, size, params);
  this.CubeUVRenderTarget.texture.name = 'PMREMCubeUVPacker.cubeUv';
  this.CubeUVRenderTarget.texture.mapping = THREE.CubeUVReflectionMapping;
  this.camera = new THREE.OrthographicCamera(
    -size * 0.5,
    size * 0.5,
    -size * 0.5,
    size * 0.5,
    0.0,
    1000
  );

  this.scene = new THREE.Scene();
  this.scene.add(this.camera);

  this.objects = [];
  var xOffset = 0;
  var faceOffsets = [];
  faceOffsets.push(new THREE.Vector2(0, 0));
  faceOffsets.push(new THREE.Vector2(1, 0));
  faceOffsets.push(new THREE.Vector2(2, 0));
  faceOffsets.push(new THREE.Vector2(0, 1));
  faceOffsets.push(new THREE.Vector2(1, 1));
  faceOffsets.push(new THREE.Vector2(2, 1));
  var yOffset = 0;
  var textureResolution = size;
  size = cubeTextureLods[0].width;
  //console.log( 'textureResolution', textureResolution );

  var offset2 = 0;
  var c = 4.0;
  this.numLods = Math.log(cubeTextureLods[0].width) / Math.log(2) - 2; // IE11 doesn't support Math.log2
  for (var i = 0; i < this.numLods; i++) {
    var offset1 = (textureResolution - textureResolution / c) * 0.5;
    //if ( size > 16 )
    c *= 2;
    var nMips = 6; //size > 16 ? 6 : 1;
    var mipOffsetX = 0;
    var mipOffsetY = 0;
    var mipSize = size;

    for (var j = 0; j < nMips; j++) {
      // Mip Maps
      for (var k = 0; k < 6; k++) {
        // 6 Cube Faces
        var material = this.getShader();
        material.uniforms['envMap'].value = this.cubeLods[i].texture;
        material.envMap = this.cubeLods[i].texture;
        material.uniforms['faceIndex'].value = k;
        material.uniforms['mapSize'].value = mipSize;
        var color = material.uniforms['testColor'].value;
        var planeMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(mipSize, mipSize, 0),
          material
        );
        planeMesh.position.x =
          faceOffsets[k].x * mipSize - offset1 + mipOffsetX;
        planeMesh.position.y =
          faceOffsets[k].y * mipSize - offset1 + offset2 + mipOffsetY;
        /*			console.log( "planeMesh.position", planeMesh.position.x + offset1, planeMesh.position.y + offset1, mipSize,
				 	( Math.abs( planeMesh.position.x + offset1 + mipSize ) > textureResolution ),
				  ( Math.abs( planeMesh.position.y + offset1 + mipSize ) > textureResolution ) );*/

        planeMesh.material.side = THREE.DoubleSide;
        this.scene.add(planeMesh);
        this.objects.push(planeMesh);
      }
      mipOffsetY += 1.75 * mipSize;
      mipOffsetX += 1.25 * mipSize;
      mipSize /= 2;
    }
    offset2 += 2 * size;
    //if ( size > 16 )
    size /= 2;
  }
};

THREE.PMREMCubeUVPacker.prototype = {
  constructor: THREE.PMREMCubeUVPacker,

  update: function(renderer) {
    var gammaInput = renderer.gammaInput;
    var gammaOutput = renderer.gammaOutput;
    var toneMapping = renderer.toneMapping;
    var toneMappingExposure = renderer.toneMappingExposure;
    renderer.gammaInput = false;
    renderer.gammaOutput = false;
    renderer.toneMapping = THREE.LinearToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.render(this.scene, this.camera, this.CubeUVRenderTarget, false);

    renderer.toneMapping = toneMapping;
    renderer.toneMappingExposure = toneMappingExposure;
    renderer.gammaInput = gammaInput;
    renderer.gammaOutput = gammaOutput;
  },

  getShader: function() {
    var shaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        faceIndex: { value: 0 },
        mapSize: { value: 0 },
        envMap: { value: null },
        testColor: { value: new THREE.Vector3(1, 1, 1) },
      },

      vertexShader:
        'precision highp float;\
				varying vec2 vUv;\
				void main() {\
					vUv = uv;\
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\
				}',

      fragmentShader:
        'precision highp float;\
				varying vec2 vUv;\
				uniform samplerCube envMap;\
				uniform float mapSize;\
				uniform vec3 testColor;\
				uniform int faceIndex;\
				\
				void main() {\
					vec3 sampleDirection;\
					vec2 uv = vUv;\
					uv = uv * 2.0 - 1.0;\
					uv.y *= -1.0;\
					if(faceIndex == 0) {\
						sampleDirection = normalize(vec3(1.0, uv.y, -uv.x));\
					} else if(faceIndex == 1) {\
						sampleDirection = normalize(vec3(uv.x, 1.0, uv.y));\
					} else if(faceIndex == 2) {\
						sampleDirection = normalize(vec3(uv.x, uv.y, 1.0));\
					} else if(faceIndex == 3) {\
						sampleDirection = normalize(vec3(-1.0, uv.y, uv.x));\
					} else if(faceIndex == 4) {\
						sampleDirection = normalize(vec3(uv.x, -1.0, -uv.y));\
					} else {\
						sampleDirection = normalize(vec3(-uv.x, uv.y, -1.0));\
					}\
					vec4 color = envMapTexelToLinear( textureCube( envMap, sampleDirection ) );\
					gl_FragColor = linearToOutputTexel( color );\
				}',

      blending: THREE.CustomBlending,
      premultipliedAlpha: false,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.ZeroFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.ZeroFactor,
      blendEquation: THREE.AddEquation,
    });

    return shaderMaterial;
  },
};

// File:examples/js/shaders/CopyShader.js

/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Full-screen textured quad shader
 */

THREE.CopyShader = {
  uniforms: {
    tDiffuse: { value: null },
    opacity: { value: 1.0 },
  },

  vertexShader: [
    'varying vec2 vUv;',

    'void main() {',

    'vUv = uv;',
    'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

    '}',
  ].join('\n'),

  fragmentShader: [
    'uniform float opacity;',

    'uniform sampler2D tDiffuse;',

    'varying vec2 vUv;',

    'void main() {',

    'vec4 texel = texture2D( tDiffuse, vUv );',
    'gl_FragColor = opacity * texel;',

    '}',
  ].join('\n'),
};

// File:examples/js/shaders/CompositeShader.js

/**
 * @author bhouston / http://clara.io
 *
 * Various composite operations
 */

THREE.CompositeShader = {
  defines: {
    BLENDING: THREE.NoBlending,
  },

  uniforms: {
    tSource: { type: 't', value: null },
    opacitySource: { type: 'f', value: 1.0 },

    tDestination: { type: 't', value: null },
    opacityDestination: { type: 'f', value: 1.0 },
  },

  vertexShader: [
    'varying vec2 vUv;',

    'void main() {',

    'vUv = uv;',
    'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

    '}',
  ].join('\n'),

  fragmentShader: [
    'uniform sampler2D tSource;',
    'uniform float opacitySource;',

    'uniform sampler2D tDestination;',
    'uniform float opacityDestination;',

    'varying vec2 vUv;',

    'void main() {',

    'vec4 d = opacityDestination * texture2D( tDestination, vUv );',
    'vec4 s = opacitySource * texture2D( tSource, vUv );',

    // all blending modes are implemented assuming premultiplied values

    '#if (BLENDING == ' + THREE.NormalBlending + ')',

    'gl_FragColor = d * ( 1.0 - s.a ) + s;',

    '#elif (BLENDING == ' + THREE.AdditiveBlending + ')',

    'gl_FragColor = d + s;',

    '#elif (BLENDING == ' + THREE.SubtractiveBlending + ')',

    'gl_FragColor = d - s;',

    '#elif (BLENDING == ' + THREE.MultiplyBlending + ')',

    'gl_FragColor = d * s;',

    '#else', // THREE.NoBlending

    'gl_FragColor = s;',

    '#endif',

    '}',
  ].join('\n'),
};

// File:examples/js/shaders/GlossyMirrorShader.js

THREE.GlossyMirrorShader = {
  defines: {
    SPECULAR_MAP: 0,
    ROUGHNESS_MAP: 0,
    GLOSSY_REFLECTIONS: 1,
    REFLECTION_LOD_LEVELS: 4,
    PERSPECTIVE_CAMERA: 1,
  },

  uniforms: {
    metalness: { type: 'f', value: 0.0 },

    specularColor: { type: 'c', value: new THREE.Color(0xffffff) },
    tSpecular: { type: 't', value: null },

    tReflection: { type: 't', value: null },
    tReflection1: { type: 't', value: null },
    tReflection2: { type: 't', value: null },
    tReflection3: { type: 't', value: null },
    tReflection4: { type: 't', value: null },
    tReflectionDepth: { type: 't', value: null },

    roughness: { type: 'f', value: 0.0 },
    distanceFade: { type: 'f', value: 0.01 },
    fresnelStrength: { type: 'f', value: 1.0 },

    reflectionTextureMatrix: { type: 'm4', value: new THREE.Matrix4() },
    mirrorCameraWorldMatrix: { type: 'm4', value: new THREE.Matrix4() },
    mirrorCameraProjectionMatrix: { type: 'm4', value: new THREE.Matrix4() },
    mirrorCameraInverseProjectionMatrix: {
      type: 'm4',
      value: new THREE.Matrix4(),
    },
    mirrorCameraNear: { type: 'f', value: 0 },
    mirrorCameraFar: { type: 'f', value: 0 },
    screenSize: { type: 'v2', value: new THREE.Vector2() },
    mirrorNormal: { type: 'v3', value: new THREE.Vector3() },
    mirrorWorldPosition: { type: 'v3', value: new THREE.Vector3() },
  },

  vertexShader: [
    'uniform mat4 reflectionTextureMatrix;',

    'varying vec4 mirrorCoord;',
    'varying vec3 vecPosition;',
    'varying vec3 worldNormal;',
    'varying vec2 vUv;',

    'void main() {',
    'vUv = uv;',
    'vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );',
    'vec4 worldPosition = modelMatrix * vec4( position, 1.0 );',
    'vecPosition = cameraPosition - worldPosition.xyz;',
    'worldNormal = (modelMatrix * vec4(normal,0.0)).xyz;',
    'mirrorCoord = reflectionTextureMatrix * worldPosition;',

    'gl_Position = projectionMatrix * mvPosition;',

    '}',
  ].join('\n'),

  blending: THREE.NormalBlending,
  transparent: true,

  fragmentShader: [
    '#include <common>',
    '#include <packing>',
    '#include <bsdfs>',

    'uniform float roughness;',
    '#if ROUGHNESS_MAP == 1',
    'uniform sampler2D tRoughness;',
    '#endif',

    'uniform float metalness;',
    'uniform float distanceFade;',
    'uniform float fresnelStrength;',

    'uniform vec3 specularColor;',
    '#if SPECULAR_MAP == 1',
    'uniform sampler2D tSpecular;',
    '#endif',

    'uniform sampler2D tReflection;',
    '#if GLOSSY_REFLECTIONS == 1',
    'uniform sampler2D tReflection1;',
    'uniform sampler2D tReflection2;',
    'uniform sampler2D tReflection3;',
    'uniform sampler2D tReflection4;',
    'uniform sampler2D tReflectionDepth;',
    '#endif',

    'varying vec3 vecPosition;',
    'varying vec3 worldNormal;',
    'varying vec2 vUv;',

    'varying vec4 mirrorCoord;',
    'uniform mat4 mirrorCameraProjectionMatrix;',
    'uniform mat4 mirrorCameraInverseProjectionMatrix;',
    'uniform mat4 mirrorCameraWorldMatrix;',
    'uniform float mirrorCameraNear;',
    'uniform float mirrorCameraFar;',
    'uniform vec2 screenSize;',
    'uniform vec3 mirrorNormal;',
    'uniform vec3 mirrorWorldPosition;',

    '#if GLOSSY_REFLECTIONS == 1',

    'float getReflectionDepth() {',

    'return unpackRGBAToDepth( texture2DProj( tReflectionDepth, mirrorCoord ) );',

    '}',

    'float getReflectionViewZ( const in float reflectionDepth ) {',
    '#if PERSPECTIVE_CAMERA == 1',
    'return perspectiveDepthToViewZ( reflectionDepth, mirrorCameraNear, mirrorCameraFar );',
    '#else',
    'return orthographicDepthToViewZ( reflectionDepth, mirrorCameraNear, mirrorCameraFar );',
    '#endif',
    '}',

    'vec3 getReflectionViewPosition( const in vec2 screenPosition, const in float reflectionDepth, const in float reflectionViewZ ) {',

    'float clipW = mirrorCameraProjectionMatrix[2][3] * reflectionViewZ + mirrorCameraProjectionMatrix[3][3];',
    'vec4 clipPosition = vec4( ( vec3( screenPosition, reflectionDepth ) - 0.5 ) * 2.0, 1.0 );',
    'clipPosition *= clipW;', // unprojection.
    'return ( mirrorCameraInverseProjectionMatrix * clipPosition ).xyz;',

    '}',

    '#endif',

    'vec4 getReflection( const in vec4 mirrorCoord, const in float lodLevel ) {',

    '#if GLOSSY_REFLECTIONS == 0',

    'return texture2DProj( tReflection, mirrorCoord );',

    '#else',

    'vec4 color0, color1;',
    'float alpha;',

    'if( lodLevel < 1.0 ) {',
    'color0 = texture2DProj( tReflection, mirrorCoord );',
    'color1 = texture2DProj( tReflection1, mirrorCoord );',
    'alpha = lodLevel;',
    '}',
    'else if( lodLevel < 2.0) {',
    'color0 = texture2DProj( tReflection1, mirrorCoord );',
    'color1 = texture2DProj( tReflection2, mirrorCoord );',
    'alpha = lodLevel - 1.0;',
    '}',
    'else if( lodLevel < 3.0 ) {',
    'color0 = texture2DProj( tReflection2, mirrorCoord );',
    'color1 = texture2DProj( tReflection3, mirrorCoord );',
    'alpha = lodLevel - 2.0;',
    '}',
    'else {',
    'color0 = texture2DProj( tReflection3, mirrorCoord );',
    'color1 = color0;',
    'alpha = 0.0;',
    '}',

    'return mix( color0, color1, alpha );',

    '#endif',

    '}',

    'void main() {',

    'vec3 specular = specularColor;',
    '#if SPECULAR_MAP == 1',
    'specular *= texture2D( tSpecular, vUv );',
    '#endif',

    'float fade = 1.0;',

    '#if GLOSSY_REFLECTIONS == 1',

    'float localRoughness = roughness;',
    '#if ROUGHNESS_MAP == 1',
    'localRoughness *= texture2D( tRoughness, vUv ).r;',
    '#endif',

    'vec2 screenPosition = gl_FragCoord.xy / screenSize;',
    'float reflectionDepth = getReflectionDepth();',
    'float reflectionViewZ = getReflectionViewZ( reflectionDepth );',

    'vec3 reflectionViewPosition = getReflectionViewPosition( screenPosition, reflectionDepth, reflectionViewZ );',
    'vec3 reflectionWorldPosition = ( mirrorCameraWorldMatrix * vec4( reflectionViewPosition, 1.0 ) ).xyz;',

    'vec3 closestPointOnMirror = projectOnPlane( reflectionWorldPosition, mirrorWorldPosition, mirrorNormal );',

    'vec3 pointOnMirror = linePlaneIntersect( cameraPosition, normalize( reflectionWorldPosition - cameraPosition ), mirrorWorldPosition, mirrorNormal );',
    'float distance = length( closestPointOnMirror - reflectionWorldPosition );',

    'localRoughness = localRoughness * distance * 0.2;',
    'float lodLevel = localRoughness;',

    'fade = 1.0 - smoothstep( 0.0, 1.0, distanceFade * distance * 0.2 );',
    '#else',

    'float lodLevel = 0.0;',

    '#endif',

    'vec4 reflection = getReflection( mirrorCoord, lodLevel );',

    // apply dieletric-conductor model parameterized by metalness parameter.
    'float dotNV = clamp( dot( normalize( worldNormal ), normalize( vecPosition ) ), EPSILON, 1.0 );',
    'specular = mix( vec3( 0.05 ), specular, metalness );',
    // TODO: Invert fresnel.
    'vec3 fresnel;',
    'if( fresnelStrength < 0.0 ) {',
    'fresnel = mix( specular, specular * pow( dotNV, 2.0 ), -fresnelStrength ) * pow( 1.0 - roughness, 2.0 );',
    '} else {',
    'fresnel = mix( specular, F_Schlick( specular, dotNV ), fresnelStrength ) * pow( 1.0 - roughness, 2.0 );',
    '}',
    'gl_FragColor = vec4( reflection.rgb, fresnel * fade * reflection.a );', // fresnel controls alpha

    '}',
  ].join('\n'),
};

// File:examples/js/shaders/SAOShader.js

/**
 * @author bhouston / http://clara.io/
 *
 * Scalable Ambient Occlusion
 *
 */

THREE.ShaderChunk['sao'] = [
  '#include <packing>',

  'float getDepth( const in vec2 screenPosition ) {',

  '#if DEPTH_PACKING == 1',
  'return unpackRGBAToDepth( texture2D( tDepth, screenPosition ) );',
  '#else',
  'return texture2D( tDepth, screenPosition ).x;',
  '#endif',

  '}',

  'vec4 setDepth( const in float depth ) {',

  '#if DEPTH_PACKING == 1',
  'return packDepthToRGBA( depth );',
  '#else',
  'return vec4( depth, 0, 0, 0 );',
  '#endif',

  '}',

  'float getViewZ( const in float depth ) {',

  '#if PERSPECTIVE_CAMERA == 1',
  'return perspectiveDepthToViewZ( depth, cameraNear, cameraFar );',
  '#else',
  'return orthographicDepthToViewZ( depth, cameraNear, cameraFar );',
  '#endif',

  '}',
].join('\n');

THREE.SAOShader = {
  blending: THREE.NoBlending,

  defines: {
    NUM_SAMPLES: 13,
    NUM_RINGS: 7,
    NORMAL_TEXTURE: 0,
    DIFFUSE_TEXTURE: 1,
    DEPTH_PACKING: 1,
    DEPTH_MIPS: 0,
    PERSPECTIVE_CAMERA: 1,
  },

  extensions: {
    derivatives: true,
  },

  uniforms: {
    tDepth: { type: 't', value: null },
    tDepth1: { type: 't', value: null },
    tDepth2: { type: 't', value: null },
    tDepth3: { type: 't', value: null },

    tDiffuse: { type: 't', value: null },
    tNormal: { type: 't', value: null },
    size: { type: 'v2', value: new THREE.Vector2(512, 512) },

    cameraNear: { type: 'f', value: 1 },
    cameraFar: { type: 'f', value: 100 },
    cameraProjectionMatrix: { type: 'm4', value: new THREE.Matrix4() },
    cameraInverseProjectionMatrix: { type: 'm4', value: new THREE.Matrix4() },

    intensity: { type: 'f', value: 0.1 },

    occlusionSphereWorldRadius: { type: 'f', value: 100.0 },
    worldToScreenRatio: { type: 'v2', value: new THREE.Vector2(1, 1) },
    randomSeed: { type: 'f', value: 0.0 },
  },

  vertexShader: [
    'varying vec2 vUv;',

    'void main() {',

    'vUv = uv;',

    'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

    '}',
  ].join('\n'),

  fragmentShader: [
    '#include <common>',

    'varying vec2 vUv;',

    '#if DIFFUSE_TEXTURE == 1',
    'uniform sampler2D tDiffuse;',
    '#endif',

    '#define MAX_MIP_LEVEL 3',

    'uniform sampler2D tDepth;',

    '#if DEPTH_MIPS == 1',
    'uniform sampler2D tDepth1;',
    'uniform sampler2D tDepth2;',
    'uniform sampler2D tDepth3;',
    '#endif',

    '#if NORMAL_TEXTURE == 1',
    'uniform sampler2D tNormal;',
    '#endif',

    'uniform float cameraNear;',
    'uniform float cameraFar;',
    'uniform mat4 cameraProjectionMatrix;',
    'uniform mat4 cameraInverseProjectionMatrix;',

    'uniform float intensity;',
    'uniform float occlusionSphereWorldRadius;',
    'uniform vec2 size;',
    'uniform vec2 worldToScreenRatio;',
    'uniform float randomSeed;',

    '#include <sao>',

    'vec4 getDefaultColor( const in vec2 screenPosition ) {',

    '#if DIFFUSE_TEXTURE == 1',
    'return texture2D( tDiffuse, vUv );',
    '#else',
    'return vec4( 1.0 );',
    '#endif',

    '}',

    'vec3 getViewPosition( const in vec2 screenPosition, const in float depth, const in float viewZ ) {',

    'float clipW = cameraProjectionMatrix[2][3] * viewZ + cameraProjectionMatrix[3][3];',
    'vec4 clipPosition = vec4( ( vec3( screenPosition, depth ) - 0.5 ) * 2.0, 1.0 );',
    'clipPosition *= clipW;', // unprojection.
    'return ( cameraInverseProjectionMatrix * clipPosition ).xyz;',

    '}',

    'vec3 getViewNormal( const in vec3 viewPosition, const in vec2 screenPosition ) {',

    '#if NORMAL_TEXTURE == 1',
    'return -unpackRGBToNormal( texture2D( tNormal, screenPosition ).xyz );',
    '#else',
    'return normalize( cross( dFdx( viewPosition ), dFdy( viewPosition ) ) );',
    '#endif',

    '}',

    'float getDepthMIP( const in vec2 screenPosition, const int mipLevel ) {',

    'vec4 rawDepth;',
    '#if DEPTH_MIPS == 0',
    'rawDepth = texture2D( tDepth, screenPosition );',
    '#else',
    'if( mipLevel == 0 ) {',
    'rawDepth = texture2D( tDepth, screenPosition );',
    '}',
    'else if( mipLevel == 1 ) {',
    'rawDepth = texture2D( tDepth1, screenPosition );',
    '}',
    'else if( mipLevel == 2 ) {',
    'rawDepth = texture2D( tDepth2, screenPosition );',
    '}',
    'else {',
    'rawDepth = texture2D( tDepth3, screenPosition );',
    '}',
    '#endif',

    '#if DEPTH_PACKING == 1',
    'return unpackRGBAToDepth( rawDepth );',
    '#else',
    'return rawDepth.x;',
    '#endif',

    '}',

    'float scaleDividedByCameraFar;',
    'float minResolutionMultipliedByCameraFar;',
    'float errorCorrectionFactor;',

    'float getOcclusion( const in vec3 centerViewPosition, const in vec3 centerViewNormal, const in vec3 sampleViewPosition ) {',

    'vec3 viewDelta = sampleViewPosition - centerViewPosition;',
    'float viewDistance2 = dot( viewDelta, viewDelta );',

    'return max( ( dot( centerViewNormal, viewDelta ) + centerViewPosition.z * 0.001 ) / ( viewDistance2 + 0.0001 ), 0.0 );// * smoothstep( pow2( occlusionSphereWorldRadius ), 0.0, viewDistance2 );',

    '}',

    /*
		"float getOcclusion( const in vec3 centerViewPosition, const in vec3 centerViewNormal, const in vec3 sampleViewPosition ) {",

			"vec3 viewDelta = sampleViewPosition - centerViewPosition;",
			"float viewDistance2 = dot( viewDelta, viewDelta );",

			"return max( pow3( pow2( occlusionSphereWorldRadius ) - viewDistance2 ), 0.0 ) *",
				"max( ( dot( centerViewNormal, viewDelta ) - 0.01 * occlusionSphereWorldRadius ) / ( viewDistance2 + 0.0001 ), 0.0 );",

		"}",*/

    //"const float maximumScreenRadius = 10.0;",

    'int getMipLevel( const in vec2 occlusionSphereScreenRadius ) {',
    'return int( clamp( floor( log2( length( occlusionSphereScreenRadius * size ) ) - 4.0 ), 0.0, 3.0 ) );',
    '}',

    // moving costly divides into consts
    'const float ANGLE_STEP = PI2 * float( NUM_RINGS ) / float( NUM_SAMPLES );',
    'const float INV_NUM_SAMPLES = 1.0 / float( NUM_SAMPLES );',

    'float getAmbientOcclusion( const in vec3 centerViewPosition ) {',

    // precompute some variables require in getOcclusion.
    'vec3 centerViewNormal = getViewNormal( centerViewPosition, vUv );',

    'vec2 invSize = 1.0 / size;',

    'vec2 occlusionSphereScreenRadius = occlusionSphereWorldRadius * worldToScreenRatio / centerViewPosition.z;',

    // jsfiddle that shows sample pattern: https://jsfiddle.net/a16ff1p7/
    'float random = rand( vUv + randomSeed );',
    'float angle = random * PI2;',
    'float radiusStep = INV_NUM_SAMPLES;',
    'float radius = radiusStep * ( 0.5 + random );',

    'float occlusionSum = 0.0;',

    'for( int i = 0; i < NUM_SAMPLES; i ++ ) {',
    'radius = (float(i) + 0.5) * radiusStep;',
    'vec2 sampleUvOffset = vec2( cos( angle ), sin( angle ) ) * radius * occlusionSphereScreenRadius * 1.0;',

    // round to nearest true sample to avoid misalignments between viewZ and normals, etc.
    'sampleUvOffset = floor( sampleUvOffset * size + vec2( 0.5 ) ) * invSize;',
    'if( sampleUvOffset.x == 0.0 && sampleUvOffset.y == 0.0 ) continue;',

    'angle += ANGLE_STEP;',

    'vec2 sampleUv = vUv + sampleUvOffset;',

    'if( sampleUv.x <= 0.0 || sampleUv.y <= 0.0 || sampleUv.x >= 1.0 || sampleUv.y >= 1.0 ) continue;', // skip points outside of texture.

    //"int depthMipLevel = getMipLevel( radius * occlusionSphereScreenRadius );",
    'float sampleDepth = getDepthMIP( sampleUv, int( 4.0 * radius ) );',
    'if( sampleDepth >= ( 1.0 - EPSILON ) ) {',
    'continue;',
    '}',

    'float sampleViewZ = getViewZ( sampleDepth );',
    'vec3 sampleViewPosition = getViewPosition( sampleUv, sampleDepth, sampleViewZ );',
    'occlusionSum += getOcclusion( centerViewPosition, centerViewNormal, sampleViewPosition );',

    '}',

    'return occlusionSum * intensity * 2.0 * occlusionSphereWorldRadius / ( float( NUM_SAMPLES ) );',
    //"return occlusionSum * intensity * 5.0 / ( float( NUM_SAMPLES ) * pow( occlusionSphereWorldRadius, 6.0 ) );",

    '}',

    'void main() {',

    'float centerDepth = getDepth( vUv );',
    'if( centerDepth >= ( 1.0 - EPSILON ) ) {',
    'discard;',
    '}',

    /*	"float mipDepth = unpackRGBAToDepth( texture2D( tDepth3, vUv ) );",
			"gl_FragColor.xyz = vec3( (centerDepth - mipDepth) * 50.0 + 0.5 );",
			"gl_FragColor.a = 1.0;",
			"return;",*/

    'float centerViewZ = getViewZ( centerDepth );',
    'vec3 viewPosition = getViewPosition( vUv, centerDepth, centerViewZ );',

    'float ambientOcclusion = getAmbientOcclusion( viewPosition );',

    //"gl_FragColor = getDefaultColor( vUv );",

    'gl_FragColor = packDepthToRGBA( centerDepth );',
    'gl_FragColor.x = max( 1.0 - ambientOcclusion, 0.0 );',

    '}',
  ].join('\n'),
};

// source: http://g3d.cs.williams.edu/websvn/filedetails.php?repname=g3d&path=%2FG3D10%2Fdata-files%2Fshader%2FAmbientOcclusion%2FAmbientOcclusion_minify.pix
THREE.SAODepthMinifyShader = {
  blending: THREE.NoBlending,

  defines: {
    DEPTH_PACKING: 1,
    //	"JITTERED_SAMPLING": 1
  },

  uniforms: {
    tDepth: { type: 't', value: null },
    cameraNear: { type: 'f', value: 1 },
    cameraFar: { type: 'f', value: 100 },
    size: { type: 'v2', value: new THREE.Vector2(256, 256) },
  },

  vertexShader: [
    'varying vec2 vUv;',

    'void main() {',

    'vUv = uv;',

    'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

    '}',
  ].join('\n'),

  fragmentShader: [
    '#include <common>',
    '#include <packing>',

    'varying vec2 vUv;',

    'uniform sampler2D tDepth;',
    'uniform vec2 size;',
    'uniform float cameraNear;',
    'uniform float cameraFar;',

    'void main() {',

    /*		g3d_FragColor.mask = texelFetch(
			CSZ_buffer,
			clamp(
				ssP * 2 + ivec2(ssP.y & 1, ssP.x & 1),
				ivec2(0),
				textureSize(CSZ_buffer, previousMIPNumber) - ivec2(1)),
			previousMIPNumber).mask;

	 }*/

    'vec2 uv = vUv;',

    //	"uv += ( round( vec2( rand( vUv * size ), rand( vUv * size + vec2( 0.333, 2.0 ) ) ) ) - 0.5 ) / size;",
    'vec2 invSize = 0.5 / size;',

    // NOTE: no need for depth decoding if nearest interpolation is used.
    /*	"float viewZ = 1.0 / perspectiveDepthToViewZ( unpackRGBAToDepth( texture2D( tDepth, vUv + invSize * vec2( -1.0, -1.0 ) ) ), cameraNear, cameraFar );",
			"viewZ += 1.0 / perspectiveDepthToViewZ( unpackRGBAToDepth( texture2D( tDepth, vUv + invSize * vec2( 1.0, 1.0 ) ) ), cameraNear, cameraFar );",
			"viewZ += 1.0 / perspectiveDepthToViewZ( unpackRGBAToDepth( texture2D( tDepth, vUv + invSize * vec2( -1.0, 1.0 ) ) ), cameraNear, cameraFar );",
			"viewZ += 1.0 / perspectiveDepthToViewZ( unpackRGBAToDepth( texture2D( tDepth, vUv + invSize * vec2( 1.0, -1.0 ) ) ), cameraNear, cameraFar );",
			"viewZ *= 0.25;",
			"gl_FragColor = packDepthToRGBA( viewZToPerspectiveDepth( 1.0 / viewZ, cameraNear, cameraFar ) );",*/
    'float depth = unpackRGBAToDepth( texture2D( tDepth, vUv + invSize * vec2( -1.0, -1.0 ) ) );',
    'depth += unpackRGBAToDepth( texture2D( tDepth, vUv + invSize * vec2( 1.0, 1.0 ) ) );',
    'depth += unpackRGBAToDepth( texture2D( tDepth, vUv + invSize * vec2( -1.0, 1.0 ) ) );',
    'depth += unpackRGBAToDepth( texture2D( tDepth, vUv + invSize * vec2( 1.0, -1.0 ) ) );',
    'depth *= 0.25;',
    'gl_FragColor = packDepthToRGBA( depth );',
    '}',
  ].join('\n'),
};

THREE.SAOBilaterialFilterShader = {
  blending: THREE.NoBlending,

  defines: {
    PERSPECTIVE_CAMERA: 1,
    KERNEL_SAMPLE_RADIUS: 4,
  },

  uniforms: {
    tAODepth: { type: 't', value: null },
    tAONormal: { type: 't', value: null },
    size: { type: 'v2', value: new THREE.Vector2(256, 256) },

    kernelDirection: { type: 'v2', value: new THREE.Vector2(1, 0) },

    cameraNear: { type: 'f', value: 1 },
    cameraFar: { type: 'f', value: 100 },
    edgeSharpness: { type: 'f', value: 3 },
    packOutput: { type: 'f', value: 1 },
  },

  vertexShader: [
    'varying vec2 vUv;',

    'void main() {',

    'vUv = uv;',

    'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

    '}',
  ].join('\n'),

  fragmentShader: [
    '#include <common>',

    'varying vec2 vUv;',

    'uniform sampler2D tAODepth;',
    'uniform sampler2D tAONormal;',
    'uniform vec2 size;',

    'uniform float cameraNear;',
    'uniform float cameraFar;',
    'uniform float edgeSharpness;',
    'uniform int packOutput;',

    'uniform vec2 kernelDirection;',

    '#include <packing>',

    'float getViewZ( const in float depth ) {',

    '#if PERSPECTIVE_CAMERA == 1',
    'return perspectiveDepthToViewZ( depth, cameraNear, cameraFar );',
    '#else',
    'return orthographicDepthToViewZ( depth, cameraNear, cameraFar );',
    '#endif',

    '}',

    'void addTapInfluence( const in vec2 tapUv, const in vec3 centerNormal, const in float centerViewZ, const in float kernelWeight, inout float aoSum, inout float weightSum ) {',

    'vec4 depthTexel = texture2D( tAODepth, tapUv );',
    'float ao = depthTexel.r;',
    'depthTexel.r = 1.0;',
    'float depth = unpackRGBAToDepth( depthTexel );',

    'if( depth >= ( 1.0 - EPSILON ) ) {',
    'return;',
    '}',

    'float tapViewZ = -getViewZ( depth );',
    'float depthWeight = max(0.0, 1.0 - (edgeSharpness * 20.0) * abs(tapViewZ - centerViewZ));',

    'vec3 normal = unpackRGBToNormal(texture2D(tAONormal, tapUv).rgb);',
    'float normalCloseness = dot(normal, centerNormal);',
    'float k_normal = 4.0;',
    'float normalError = (1.0 - pow4( normalCloseness )) * k_normal;',
    'float normalWeight = max((1.0 - edgeSharpness * normalError), 0.00);',

    'float tapWeight = kernelWeight * ( depthWeight + normalWeight );',

    'aoSum += ao * tapWeight;',
    'weightSum += tapWeight;',
    '}',

    'float normpdf(in float x, in float sigma) {',
    'return 0.39894*exp(-0.5*x*x/(sigma*sigma))/sigma;',
    '}',

    'void main() {',

    'vec4 depthTexel = texture2D( tAODepth, vUv );',
    'float ao = depthTexel.r;',
    'depthTexel.r = 1.0;',
    'float depth = unpackRGBAToDepth( depthTexel );',
    'if( depth >= ( 1.0 - EPSILON ) ) {',
    'discard;',
    '}',

    'float centerViewZ = -getViewZ( depth );',

    'float weightSum = normpdf(0.0, 5.0) + 0.1;',
    'float aoSum = ao * weightSum;',

    'vec2 uvIncrement = ( kernelDirection / size );',

    'vec2 rTapUv = vUv, lTapUv = vUv;',
    'vec3 normalCenter = unpackRGBToNormal(texture2D(tAONormal, vUv).rgb);',

    'for( int i = 1; i <= KERNEL_SAMPLE_RADIUS; i ++ ) {',

    'float kernelWeight = normpdf(float(i), 5.0) + 0.1;',

    'rTapUv += uvIncrement;',
    'addTapInfluence( rTapUv, normalCenter, centerViewZ, kernelWeight, aoSum, weightSum );',

    'lTapUv -= uvIncrement;',
    'addTapInfluence( lTapUv, normalCenter, centerViewZ, kernelWeight, aoSum, weightSum );',

    '}',

    'ao = aoSum / weightSum;',
    'if( packOutput == 1 ) {',
    'gl_FragColor = depthTexel;',
    'gl_FragColor.r = ao;',
    '}',
    'else {',
    'gl_FragColor = vec4( vec3( ao ), 1.0 );',
    '}',

    '}',
  ].join('\n'),
};

// File:examples/js/shaders/BlurShader.js

/**
 * @author bhouston / http://clara.io
 *
 * For a horizontal blur, use X_STEP 1, Y_STEP 0
 * For a vertical blur, use X_STEP 0, Y_STEP 1
 *
 */

THREE.BlurShader = {
  defines: {
    KERNEL_RADIUS: 4,
  },

  uniforms: {
    tDiffuse: { type: 't', value: null },
    size: { type: 'v2', value: new THREE.Vector2(512, 512) },
    sampleUvOffsets: { type: 'v2v', value: [new THREE.Vector2(0, 0)] },
    sampleWeights: { type: '1fv', value: [1.0] },
  },

  vertexShader: [
    '#include <common>',

    'varying vec2 vUv;',

    'void main() {',

    'vUv = uv;',

    'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

    '}',
  ].join('\n'),

  fragmentShader: [
    'uniform sampler2D tDiffuse;',
    'uniform vec2 size;',

    'uniform vec2 sampleUvOffsets[ KERNEL_RADIUS + 1 ];',
    'uniform float sampleWeights[ KERNEL_RADIUS + 1 ];',

    'varying vec2 vUv;',

    'void main() {',

    'vec2 invSize = 1.0 / size;',

    'float weightSum = sampleWeights[0];',
    'vec4 diffuseSum = texture2D( tDiffuse, vUv ) * weightSum;',

    'for( int i = 1; i <= KERNEL_RADIUS; i ++ ) {',

    'float weight = sampleWeights[i];',
    'vec2 sampleUvOffset = sampleUvOffsets[i] * invSize;',
    'diffuseSum += ( texture2D( tDiffuse, vUv + sampleUvOffset ) + texture2D( tDiffuse, vUv - sampleUvOffset ) ) * weight;',
    'weightSum += 2.0 * weight;',

    '}',

    'gl_FragColor =diffuseSum / weightSum;',

    '}',
  ].join('\n'),
};

THREE.BlurShaderUtils = {
  createSampleWeights: function(kernelRadius, stdDev) {
    var gaussian = function(x, stdDev) {
      return (
        Math.exp(-(x * x) / (2.0 * (stdDev * stdDev))) /
        (Math.sqrt(2.0 * Math.PI) * stdDev)
      );
    };

    var weights = [];

    for (var i = 0; i <= kernelRadius; i++) {
      weights.push(gaussian(i, stdDev));
    }

    return weights;
  },

  createSampleOffsets: function(kernelRadius, uvIncrement) {
    var offsets = [];

    for (var i = 0; i <= kernelRadius; i++) {
      offsets.push(uvIncrement.clone().multiplyScalar(i));
    }

    return offsets;
  },

  configure: function(material, kernelRadius, stdDev, uvIncrement) {
    kernelRadius = kernelRadius | 0;

    if (
      material.defines['KERNEL_RADIUS'] !== kernelRadius ||
      material.stdDev != stdDev
    ) {
      material.defines['KERNEL_RADIUS'] = kernelRadius;
      material.uniforms[
        'sampleUvOffsets'
      ].value = THREE.BlurShaderUtils.createSampleOffsets(
        kernelRadius,
        uvIncrement
      );
      material.uniforms[
        'sampleWeights'
      ].value = THREE.BlurShaderUtils.createSampleWeights(kernelRadius, stdDev);

      material.uvIncrement = uvIncrement;
      material.stdDev = stdDev;

      material.needsUpdate = true;
    }
  },
};

// File:examples/js/shaders/LuminosityHighPassShader.js

/**
 * @author bhouston / http://clara.io/
 *
 * Luminosity
 * http://en.wikipedia.org/wiki/Luminosity
 */

THREE.LuminosityHighPassShader = {
  shaderID: 'luminosityHighPass',

  uniforms: {
    tDiffuse: { type: 't', value: null },
    luminosityThreshold: { type: 'f', value: 1.0 },
    smoothWidth: { type: 'f', value: 1.0 },
    defaultColor: { type: 'c', value: new THREE.Color(0x000000) },
    defaultOpacity: { type: 'f', value: 0.0 },
  },

  vertexShader: [
    'varying vec2 vUv;',

    'void main() {',

    'vUv = uv;',

    'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

    '}',
  ].join('\n'),

  fragmentShader: [
    'uniform sampler2D tDiffuse;',
    'uniform vec3 defaultColor;',
    'uniform float defaultOpacity;',
    'uniform float luminosityThreshold;',
    'uniform float smoothWidth;',

    'varying vec2 vUv;',

    'void main() {',

    'vec4 texel = texture2D( tDiffuse, vUv );',

    'vec3 luma = vec3( 0.299, 0.587, 0.114 );',

    'float v = dot( texel.xyz, luma );',

    'vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );',

    'float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );',

    'gl_FragColor = mix( outputColor, texel, alpha );',

    '}',
  ].join('\n'),
};

// File:examples/js/postprocessing/EffectComposer.js

/**
 * @author alteredq / http://alteredqualia.com/
 * @author bhouston / http://clara.io/
 */

THREE.EffectComposer = function(renderer, cameraAware, renderTarget) {
  this.renderer = renderer;
  this.cameraAware = cameraAware || false;

  if (renderTarget === undefined) {
    var parameters = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      stencilBuffer: true,
    };
    var size = renderer.getSize();
    renderTarget = new THREE.WebGLRenderTarget(
      size.width,
      size.height,
      parameters
    );
    renderTarget.texture.name = 'EffectComposer.rt1';
    renderTarget.texture.generateMipmaps = false;
  }

  this.renderTarget1 = renderTarget;
  this.renderTarget2 = renderTarget.clone();
  this.renderTarget2.texture.name = 'EffectComposer.rt2';
  this.renderTarget2.texture.generateMipmaps = false;

  this.writeBuffer = this.renderTarget1;
  this.readBuffer = this.renderTarget2;

  if (this.cameraAware) {
    this.writeBuffer2 = this.renderTarget1.clone();
    this.readBuffer2 = this.renderTarget2.clone();
  }

  this.tempBufferMap = {};

  this.passes = [];

  if (THREE.CopyShader === undefined)
    console.error('THREE.EffectComposer relies on THREE.CopyShader');

  this.copyPass = new THREE.ShaderPass(THREE.CopyShader);
};

Object.assign(THREE.EffectComposer.prototype, {
  swapBuffers: function() {
    var tmp = this.readBuffer;
    this.readBuffer = this.writeBuffer;
    this.writeBuffer = tmp;
  },

  swapDualBuffers: function() {
    var tmp = this.readBuffer;
    this.readBuffer = this.writeBuffer;
    this.writeBuffer = tmp;

    tmp = this.readBuffer2;
    this.readBuffer2 = this.writeBuffer2;
    this.writeBuffer2 = tmp;
  },

  requestBuffer: function(key) {
    if (!this.tempBufferMap[key]) {
      var sharedRenderTarget = this.renderTarget1.clone();
      sharedRenderTarget.texture.name = 'EffectComposer.buffer[' + key + ']';
      sharedRenderTarget.texture.generateMipmaps = false;
      this.tempBufferMap[key] = sharedRenderTarget;
    }
    return this.tempBufferMap[key];
  },

  addPass: function(pass) {
    this.passes.push(pass);

    var size = this.renderer.getSize();
    pass.setSize(size.width, size.height);
  },

  insertPass: function(pass, index) {
    this.passes.splice(index, 0, pass);
  },

  render: function(delta) {
    var maskActive = false;

    var pass,
      i,
      il = this.passes.length;

    for (i = 0; i < il; i++) {
      pass = this.passes[i];

      if (pass.enabled === false) continue;

      pass.render(
        this.renderer,
        this.writeBuffer,
        this.readBuffer,
        delta,
        maskActive
      );

      if (pass.needsSwap) {
        if (maskActive) {
          var context = this.renderer.context;

          context.stencilFunc(context.NOTEQUAL, 1, 0xffffffff);

          this.copyPass.render(
            this.renderer,
            this.writeBuffer,
            this.readBuffer,
            delta
          );

          context.stencilFunc(context.EQUAL, 1, 0xffffffff);
        }

        this.swapBuffers();
      }

      if (THREE.MaskPass !== undefined) {
        if (pass instanceof THREE.MaskPass) {
          maskActive = true;
        } else if (pass instanceof THREE.ClearMaskPass) {
          maskActive = false;
        }
      }
    }
  },

  vrRender: function(vrEffect, scene, camera, forceClear, delta) {
    var vrDisplay = vrEffect.getVRDisplay();

    if (vrDisplay && vrDisplay.isPresenting) {
      var autoUpdate = scene.autoUpdate;

      if (autoUpdate) {
        scene.updateMatrixWorld();
        scene.autoUpdate = false;
      }

      var size = this.renderer.getSize();
      var eyeParamsL = vrDisplay.getEyeParameters('left');
      var eyeParamsR = vrDisplay.getEyeParameters('right');

      var eyeTranslationL = new THREE.Vector3().fromArray(eyeParamsL.offset);
      var eyeTranslationR = new THREE.Vector3().fromArray(eyeParamsR.offset);

      var defaultLeftBounds = [0.0, 0.0, 0.5, 1.0];
      var defaultRightBounds = [0.5, 0.0, 0.5, 1.0];
      var frameData = null;

      if ('VRFrameData' in window) {
        frameData = new window.VRFrameData();
      }

      var maskActive = false;

      if (Array.isArray(scene)) {
        console.warn(
          'THREE.VREffect.render() no longer supports arrays. Use object.layers instead.'
        );
        scene = scene[0];
      }

      // When rendering we don't care what the recommended size is, only what the actual size
      // of the backbuffer is.

      var layers = vrDisplay.getLayers();
      var leftBounds;
      var rightBounds;

      if (layers.length) {
        var layer = layers[0];

        leftBounds =
          layer.leftBounds !== null && layer.leftBounds.length === 4
            ? layer.leftBounds
            : defaultLeftBounds;
        rightBounds =
          layer.rightBounds !== null && layer.rightBounds.length === 4
            ? layer.rightBounds
            : defaultRightBounds;
      } else {
        leftBounds = defaultLeftBounds;
        rightBounds = defaultRightBounds;
      }

      var renderRectL = {
        x: Math.round(size.width * leftBounds[0]),
        y: Math.round(size.height * leftBounds[1]),
        width: Math.round(size.width * leftBounds[2]),
        height: Math.round(size.height * leftBounds[3]),
      };
      var renderRectR = {
        x: Math.round(size.width * rightBounds[0]),
        y: Math.round(size.height * rightBounds[1]),
        width: Math.round(size.width * rightBounds[2]),
        height: Math.round(size.height * rightBounds[3]),
      };

      if (this.renderer.autoClear || forceClear) this.renderer.clear();

      if (camera.parent === null) camera.updateMatrixWorld();

      var cameraL = vrEffect.getCameraL();
      var cameraR = vrEffect.getCameraR();
      camera.matrixWorld.decompose(
        cameraL.position,
        cameraL.quaternion,
        cameraL.scale
      );
      camera.matrixWorld.decompose(
        cameraR.position,
        cameraR.quaternion,
        cameraR.scale
      );

      var scale = vrEffect.scale;
      cameraL.translateOnAxis(eyeTranslationL, scale);
      cameraR.translateOnAxis(eyeTranslationR, scale);

      if (vrDisplay.getFrameData) {
        vrDisplay.depthNear = camera.near;
        vrDisplay.depthFar = camera.far;

        vrDisplay.getFrameData(frameData);

        cameraL.projectionMatrix.elements = frameData.leftProjectionMatrix;
        cameraR.projectionMatrix.elements = frameData.rightProjectionMatrix;
        cameraL.updateMatrixWorld();
        cameraR.updateMatrixWorld();
      } else {
        cameraL.projectionMatrix = vrEffect.fovToProjection(
          eyeParamsL.fieldOfView,
          true,
          camera.near,
          camera.far
        );
        cameraR.projectionMatrix = vrEffect.fovToProjection(
          eyeParamsR.fieldOfView,
          true,
          camera.near,
          camera.far
        );
      }

      var pass,
        i,
        il = this.passes.length;

      for (i = 0; i < il; i++) {
        pass = this.passes[i];

        if (pass.enabled === false || pass.cameraAware === false) continue;

        this.renderer.setScissorTest(true);

        // render left eye
        this.renderer.setScissor(
          renderRectL.x,
          renderRectL.y,
          renderRectL.width,
          renderRectL.height
        );
        this.renderer.setViewport(
          renderRectL.x,
          renderRectL.y,
          renderRectL.width,
          renderRectL.height
        );

        if (pass.camera && pass.camera.isPerspectiveCamera)
          pass.camera = cameraL;
        pass.render(
          this.renderer,
          this.writeBuffer,
          this.readBuffer,
          delta,
          maskActive
        );

        // // render right eye
        this.renderer.setScissor(
          renderRectR.x,
          renderRectR.y,
          renderRectR.width,
          renderRectR.height
        );
        this.renderer.setViewport(
          renderRectR.x,
          renderRectR.y,
          renderRectR.width,
          renderRectR.height
        );

        if (pass.camera && pass.camera.isPerspectiveCamera)
          pass.camera = cameraR;
        pass.render(
          this.renderer,
          this.writeBuffer2,
          this.readBuffer2,
          delta,
          maskActive
        );

        if (pass.needsSwap) {
          if (maskActive) {
            var context = this.renderer.context;

            context.stencilFunc(context.NOTEQUAL, 1, 0xffffffff);

            this.copyPass.render(
              this.renderer,
              this.writeBuffer,
              this.readBuffer,
              delta
            );

            context.stencilFunc(context.EQUAL, 1, 0xffffffff);
          }

          this.swapDualBuffers();
        }

        if (THREE.MaskPass !== undefined) {
          if (pass instanceof THREE.MaskPass) {
            maskActive = true;
          } else if (pass instanceof THREE.ClearMaskPass) {
            maskActive = false;
          }
        }

        if (pass.camera && pass.camera.isPerspectiveCamera)
          pass.camera = camera;
      }

      this.renderer.setScissorTest(false);
      this.renderer.setViewport(0, 0, size.width, size.height);

      if (autoUpdate) {
        scene.autoUpdate = true;
      }

      if (vrEffect.autoSubmitFrame) {
        vrEffect.submitFrame();
      }
    }

    if (!this.renderer.getContextAttributes().preserveDrawingBuffer)
      this.render();
  },

  stereoRender: function(stereoEffect, scene, camera, delta) {
    camera.updateMatrixWorld();
    stereoEffect.updateStereo(camera);

    var maskActive = false;

    var pass,
      i,
      il = this.passes.length;

    var size = this.renderer.getSize();

    for (i = 0; i < il; i++) {
      pass = this.passes[i];

      if (pass.enabled === false || pass.cameraAware === false) continue;

      this.renderer.setScissorTest(true);

      this.renderer.setScissor(0, 0, size.width / 2, size.height);
      this.renderer.setViewport(0, 0, size.width / 2, size.height);
      if (pass.camera instanceof THREE.PerspectiveCamera)
        pass.camera = stereoEffect.getCameraL(); // the camera of texturePass is orthographcial
      pass.render(
        this.renderer,
        this.writeBuffer,
        this.readBuffer,
        delta,
        maskActive
      );

      this.renderer.setScissor(size.width / 2, 0, size.width / 2, size.height);
      this.renderer.setViewport(size.width / 2, 0, size.width / 2, size.height);
      if (pass.camera instanceof THREE.PerspectiveCamera)
        pass.camera = stereoEffect.getCameraR();
      pass.render(
        this.renderer,
        this.writeBuffer2,
        this.readBuffer2,
        delta,
        maskActive
      );

      if (pass.needsSwap) {
        if (maskActive) {
          var context = this.renderer.context;

          context.stencilFunc(context.NOTEQUAL, 1, 0xffffffff);

          this.copyPass.render(
            this.renderer,
            this.writeBuffer,
            this.readBuffer,
            delta
          );

          context.stencilFunc(context.EQUAL, 1, 0xffffffff);
        }

        this.swapBuffers();
      }

      if (THREE.MaskPass !== undefined) {
        if (pass instanceof THREE.MaskPass) {
          maskActive = true;
        } else if (pass instanceof THREE.ClearMaskPass) {
          maskActive = false;
        }
      }
    }
  },

  reset: function(renderTarget) {
    if (renderTarget === undefined) {
      var size = this.renderer.getSize();

      renderTarget = this.renderTarget1.clone();
      renderTarget.setSize(size.width, size.height);
    }

    this.renderTarget1.dispose();
    this.renderTarget2.dispose();
    this.renderTarget1 = renderTarget;
    this.renderTarget2 = renderTarget.clone();

    this.writeBuffer = this.renderTarget1;
    this.readBuffer = this.renderTarget2;

    if (this.cameraAware) {
      this.writeBuffer2 = this.writeBuffer.clone();
      this.readBuffer2 = this.readBuffer.clone();
    }
  },

  dispose: function() {
    for (var key in this.tempBufferMap) {
      if (this.tempBufferMap.hasOwnProperty(key)) {
        this.tempBufferMap[key].dispose();
      }
    }

    for (var i = 0; i < this.passes.length; i++) {
      this.passes[i].dispose();
    }
  },

  setSize: function(width, height) {
    this.renderTarget1.setSize(width, height);
    this.renderTarget2.setSize(width, height);

    if (this.cameraAware) {
      this.writeBuffer2.setSize(width, height);
      this.readBuffer2.setSize(width, height);
    }

    for (var key in this.tempBufferMap) {
      if (this.tempBufferMap.hasOwnProperty(key)) {
        this.tempBufferMap[key].setSize(width, height);
      }
    }

    for (var i = 0; i < this.passes.length; i++) {
      this.passes[i].setSize(width, height);
    }
  },
});

THREE.Pass = function() {
  // if set to true, the pass is processed by the composer
  this.enabled = true;

  // if set to true, the pass indicates to swap read and write buffer after rendering
  this.needsSwap = true;

  // if set to true, the pass clears its buffer before rendering
  this.clear = false;

  // if set to true, the result of the pass is rendered to screen
  this.renderToScreen = false;

  // if set to true, the result of the pass is rendered to both camera of the vr effect
  this.cameraAware = false;
};

Object.assign(THREE.Pass.prototype, {
  setSize: function(width, height) {},

  dispose: function() {},

  render: function(renderer, writeBuffer, readBuffer, delta, maskActive) {
    console.error('THREE.Pass: .render() must be implemented in derived pass.');
  },
});

// File:examples/js/postprocessing/RenderPass.js

/**
 * @author alteredq / http://alteredqualia.com/
 * @author bhouston / http://clara.io/
 */

THREE.RenderPass = function(
  scene,
  camera,
  overrideMaterial,
  clearColor,
  clearAlpha
) {
  THREE.Pass.call(this);

  this.scene = scene;
  this.camera = camera;

  this.renderOver = false;

  this.overrideMaterial = overrideMaterial;

  this.clearColor = clearColor;
  this.clearAlpha = clearAlpha !== undefined ? clearAlpha : 0;

  this.clear = true;
  this.clearDepth = false;
  this.needsSwap = false;

  if (THREE.CopyShader === undefined)
    console.error('THREE.SSAARenderPass relies on THREE.CopyShader');

  this.overMaterial = new THREE.ShaderMaterial(THREE.CopyShader);
  this.overMaterial.uniforms = THREE.UniformsUtils.clone(
    this.overMaterial.uniforms
  );
  this.overMaterial.blending = THREE.NormalBlending;
  this.overMaterial.premultipliedAlpha = true;
  this.overMaterial.transparent = true;
  this.overMaterial.depthTest = false;
  this.overMaterial.depthWrite = false;

  this.camera2 = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  this.scene2 = new THREE.Scene();
  this.quad2 = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.copyMaterial);
  this.quad2.frustumCulled = false; // Avoid getting clipped
  this.scene2.add(this.quad2);
};

THREE.RenderPass.prototype = Object.assign(
  Object.create(THREE.Pass.prototype),
  {
    constructor: THREE.RenderPass,

    render: function(renderer, writeBuffer, readBuffer, delta, maskActive) {
      var oldAutoClear = renderer.autoClear;
      renderer.autoClear = false;

      this.scene.overrideMaterial = this.overrideMaterial;

      var oldClearColor, oldClearAlpha;
      oldClearColor = renderer.getClearColor();
      oldClearAlpha = renderer.getClearAlpha();

      if (this.clearDepth) {
        renderer.clearDepth();
      }

      if (this.renderOver) {
        renderer.setClearColor(0x000000, 0);
        renderer.renderOverride(
          this.overrideMaterial,
          this.scene,
          this.camera,
          writeBuffer,
          true
        );

        this.overMaterial.uniforms['tDiffuse'].value = writeBuffer.texture;

        if (this.clearColor !== undefined) {
          renderer.setClearColor(this.clearColor, this.clearAlpha);
        }

        renderer.renderOverride(
          this.overMaterial,
          this.scene2,
          this.camera2,
          this.renderToScreen ? null : readBuffer,
          this.clear
        );
      } else {
        if (this.clearColor !== undefined) {
          renderer.setClearColor(this.clearColor, this.clearAlpha);
        }
        renderer.renderOverride(
          this.overrideMaterial,
          this.scene,
          this.camera,
          this.renderToScreen ? null : readBuffer,
          this.clear
        );
      }

      if (this.clearColor) {
        renderer.setClearColor(oldClearColor, oldClearAlpha);
      }

      this.scene.overrideMaterial = null;
      renderer.autoClear = oldAutoClear;
    },
  }
);
// File:examples/js/postprocessing/MaskPass.js

/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.MaskPass = function(scene, camera) {
  THREE.Pass.call(this);

  this.scene = scene;
  this.camera = camera;

  this.clear = true;
  this.needsSwap = false;

  this.inverse = false;
};

THREE.MaskPass.prototype = Object.assign(Object.create(THREE.Pass.prototype), {
  constructor: THREE.MaskPass,

  render: function(renderer, writeBuffer, readBuffer, delta, maskActive) {
    var context = renderer.context;
    var state = renderer.state;

    // don't update color or depth

    state.buffers.color.setMask(false);
    state.buffers.depth.setMask(false);

    // lock buffers

    state.buffers.color.setLocked(true);
    state.buffers.depth.setLocked(true);

    // set up stencil

    var writeValue, clearValue;

    if (this.inverse) {
      writeValue = 0;
      clearValue = 1;
    } else {
      writeValue = 1;
      clearValue = 0;
    }

    state.buffers.stencil.setTest(true);
    state.buffers.stencil.setOp(
      context.REPLACE,
      context.REPLACE,
      context.REPLACE
    );
    state.buffers.stencil.setFunc(context.ALWAYS, writeValue, 0xffffffff);
    state.buffers.stencil.setClear(clearValue);

    // draw into the stencil buffer

    renderer.render(this.scene, this.camera, readBuffer, this.clear);
    renderer.render(this.scene, this.camera, writeBuffer, this.clear);

    // unlock color and depth buffer for subsequent rendering

    state.buffers.color.setLocked(false);
    state.buffers.depth.setLocked(false);

    // only render where stencil is set to 1

    state.buffers.stencil.setFunc(context.EQUAL, 1, 0xffffffff); // draw if == 1
    state.buffers.stencil.setOp(context.KEEP, context.KEEP, context.KEEP);
  },
});

THREE.ClearMaskPass = function() {
  THREE.Pass.call(this);

  this.needsSwap = false;
};

THREE.ClearMaskPass.prototype = Object.create(THREE.Pass.prototype);

Object.assign(THREE.ClearMaskPass.prototype, {
  render: function(renderer, writeBuffer, readBuffer, delta, maskActive) {
    renderer.state.buffers.stencil.setTest(false);
  },
});

// File:examples/js/postprocessing/ShaderPass.js

/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.ShaderPass = function(shader, textureID) {
  THREE.Pass.call(this);

  this.textureID = textureID !== undefined ? textureID : 'tDiffuse';

  if (shader instanceof THREE.ShaderMaterial) {
    this.uniforms = shader.uniforms;

    this.material = shader;
  } else if (shader) {
    this.uniforms = THREE.UniformsUtils.clone(shader.uniforms);

    this.material = new THREE.ShaderMaterial({
      defines: shader.defines || {},
      uniforms: this.uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
    });
  }

  this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  this.scene = new THREE.Scene();

  this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null);
  this.quad.frustumCulled = false; // Avoid getting clipped
  this.scene.add(this.quad);
};

THREE.ShaderPass.prototype = Object.assign(
  Object.create(THREE.Pass.prototype),
  {
    constructor: THREE.ShaderPass,

    render: function(renderer, writeBuffer, readBuffer, delta, maskActive) {
      if (this.uniforms[this.textureID]) {
        this.uniforms[this.textureID].value = readBuffer.texture;
      }

      if (this.renderToScreen) {
        renderer.renderPass(this.material);
      } else {
        renderer.renderPass(this.material, writeBuffer, this.clear);
      }
    },
  }
);

// File:examples/js/postprocessing/SAOPass.js

/**
*
* Scalable Ambient Occlusion
*
* @author bhouston / http://clara.io/
*
*
*/

THREE.SAOPass = function(scene, camera) {
  THREE.Pass.call(this);

  this.scene = scene;
  this.camera = camera;

  this.intensity = 0.5;
  this.implicitNormals = false; // explicit normals requires or there are artifacts on mobile.
  this.occlusionSphereWorldRadius = 20;
  this.blurEnabled = true;
  this.outputOverride = null; // 'beauty', 'depth', 'sao'
  this.depthMIPs = false;
  this.downSamplingRatio = 2;
  this.blurKernelSize = this.downSamplingRatio === 1 ? 8 : 6;
  this.edgeSharpness = 1;

  /*
	if ( false && renderer.extensions.get('WEBGL_depth_texture') ) {

		console.log( "using depth extension");

		this.depthTexture = optionalBuffers.depthTexture || new THREE.DepthTexture();
		this.depthTexture.type = isWebGL2 ? THREE.FloatType : THREE.UnsignedShortType;
		this.depthTexture.minFilter = THREE.NearestFilter;
		this.depthTexture.maxFilter = THREE.NearestFilter;

		this.beautyRenderTarget.depthBuffer = true;
		this.beautyRenderTarget.depthTexture = this.depthTexture;

	}*/

  this.depthMaterial = new THREE.MeshDepthMaterial();
  this.depthMaterial.depthPacking = THREE.RGBADepthPacking;
  this.depthMaterial.blending = THREE.NoBlending;
  this.depthMaterial.side = THREE.DoubleSide;

  this.normalMaterial = new THREE.MeshNormalMaterial();
  this.normalMaterial.side = this.depthMaterial.side; // both normal and depth materials bot need to render with the same sidedness

  if (THREE.SAOShader === undefined)
    console.error('THREE.SAOPass relies on THREE.SAOShader');
  if (THREE.CopyShader === undefined)
    console.error('THREE.SAOPass relies on THREE.CopyShader');

  this.depthMinifyMaterial = new THREE.ShaderMaterial(
    THREE.SAODepthMinifyShader
  );
  this.depthMinifyMaterial.uniforms = THREE.UniformsUtils.clone(
    this.depthMinifyMaterial.uniforms
  );
  this.depthMinifyMaterial.defines = Object.assign(
    {},
    this.depthMinifyMaterial.defines
  );
  this.depthMinifyMaterial.blending = THREE.NoBlending;

  this.saoMaterial = new THREE.ShaderMaterial(THREE.SAOShader);
  this.saoMaterial.uniforms = THREE.UniformsUtils.clone(
    this.saoMaterial.uniforms
  );
  this.saoMaterial.defines = Object.assign({}, this.saoMaterial.defines);
  this.saoMaterial.defines['DIFFUSE_TEXTURE'] = 0;
  this.saoMaterial.defines['NORMAL_TEXTURE'] = this.implicitNormals ? 0 : 1;
  this.saoMaterial.defines['MODE'] = 2;

  this.bilateralFilterMaterial = new THREE.ShaderMaterial(
    THREE.SAOBilaterialFilterShader
  );
  this.bilateralFilterMaterial.uniforms = THREE.UniformsUtils.clone(
    this.bilateralFilterMaterial.uniforms
  );
  this.bilateralFilterMaterial.defines = Object.assign(
    {},
    this.bilateralFilterMaterial.defines
  );
  this.bilateralFilterMaterial.blending = THREE.NoBlending;
  this.bilateralFilterMaterial.premultipliedAlpha = true;

  this.bilateralUpsamplerMaterial = this.getBilateralUpsamplerMaterial();

  this.copyMaterial = new THREE.ShaderMaterial(THREE.CopyShader);
  this.copyMaterial.uniforms = THREE.UniformsUtils.clone(
    this.copyMaterial.uniforms
  );
  this.copyMaterial.uniforms['opacity'].value = 1.0;
  this.copyMaterial.blending = THREE.NoBlending;
  this.copyMaterial.premultipliedAlpha = true;
  this.copyMaterial.transparent = true;
  this.copyMaterial.depthTest = false;
  this.copyMaterial.depthWrite = false;
};

THREE.SAOPass.prototype = {
  dispose: function() {
    if (this.saoRenderTarget) {
      this.saoRenderTarget.dispose();
      this.saoRenderTarget = null;
    }
    if (this.blurIntermediateRenderTarget) {
      this.blurIntermediateRenderTarget.dispose();
      this.blurIntermediateRenderTarget = null;
    }
    if (this.depthRenderTarget) {
      this.depthRenderTarget.dispose();
      this.depthRenderTarget = null;
    }
    if (this.depth1RenderTarget) {
      this.depth1RenderTarget.dispose();
      this.depth1RenderTarget = null;
    }
    if (this.depth2RenderTarget) {
      this.depth2RenderTarget.dispose();
      this.depth2RenderTarget = null;
    }
    if (this.depth3RenderTarget) {
      this.depth3RenderTarget.dispose();
      this.depth3RenderTarget = null;
    }
    if (this.normalRenderTarget) {
      this.normalRenderTarget.dispose();
      this.normalRenderTarget = null;
    }
    if (this.normalRenderTargetFullRes) {
      this.normalRenderTargetFullRes.dispose();
      this.normalRenderTargetFullRes = null;
    }
    if (this.depthRenderTargetFullRes) {
      this.depthRenderTargetFullRes.dispose();
      this.depthRenderTargetFullRes = null;
    }
    if (this.saoRenderTargetFullRes) {
      this.saoRenderTargetFullRes.dispose();
      this.saoRenderTargetFullRes = null;
    }
  },

  setSize: function(width, height) {
    if (this.saoRenderTargetFullRes)
      this.saoRenderTargetFullRes.setSize(width, height);
    if (this.depthRenderTargetFullRes)
      this.depthRenderTargetFullRes.setSize(width, height);
    if (this.normalRenderTargetFullRes)
      this.normalRenderTargetFullRes.setSize(width, height);
    width = Math.ceil(width / this.downSamplingRatio);
    height = Math.ceil(height / this.downSamplingRatio);
    if (this.saoRenderTarget) this.saoRenderTarget.setSize(width, height);
    if (this.blurIntermediateRenderTarget)
      this.blurIntermediateRenderTarget.setSize(width, height);
    if (this.depthRenderTarget) this.depthRenderTarget.setSize(width, height);
    if (this.depth1RenderTarget)
      this.depth1RenderTarget.setSize(
        Math.ceil(width / 2),
        Math.ceil(height / 2)
      );
    if (this.depth2RenderTarget)
      this.depth2RenderTarget.setSize(
        Math.ceil(width / 4),
        Math.ceil(height / 4)
      );
    if (this.depth3RenderTarget)
      this.depth3RenderTarget.setSize(
        Math.ceil(width / 8),
        Math.ceil(height / 8)
      );
    if (this.normalRenderTarget) this.normalRenderTarget.setSize(width, height);

    this.saoMaterial.uniforms['size'].value.set(width, height);
    this.bilateralFilterMaterial.uniforms['size'].value.set(width, height);
    //console.log( 'downsampledsize: ', width, height );
  },

  updateParameters: function(camera) {
    var vSizeAt1M = 1 / (Math.tan(THREE.Math.DEG2RAD * camera.fov * 0.5) * 2);
    var sizeAt1M = new THREE.Vector2(vSizeAt1M / camera.aspect, vSizeAt1M);

    this.saoMaterial.uniforms['worldToScreenRatio'].value = sizeAt1M;
    this.saoMaterial.uniforms['intensity'].value = this.intensity;
    this.saoMaterial.uniforms[
      'occlusionSphereWorldRadius'
    ].value = this.occlusionSphereWorldRadius;

    this.depthMinifyMaterial.uniforms['cameraNear'].value = camera.near;
    this.depthMinifyMaterial.uniforms['cameraFar'].value = camera.far;

    this.saoMaterial.uniforms['cameraNear'].value = camera.near;
    this.saoMaterial.uniforms['cameraFar'].value = camera.far;
    this.saoMaterial.uniforms['cameraProjectionMatrix'].value =
      camera.projectionMatrix;
    this.saoMaterial.uniforms['cameraInverseProjectionMatrix'].value.getInverse(
      camera.projectionMatrix
    );

    this.bilateralFilterMaterial.uniforms['cameraNear'].value = camera.near;
    this.bilateralFilterMaterial.uniforms['cameraFar'].value = camera.far;
  },

  render: function(renderer, writeBuffer, readBuffer, delta, maskActive) {
    var width = readBuffer.width,
      height = readBuffer.height;

    width = Math.ceil(width / this.downSamplingRatio);
    height = Math.ceil(height / this.downSamplingRatio);

    var depthTexture =
      readBuffer.depthBuffer && readBuffer.depthTexture
        ? readBuffer.depthTexture
        : null;

    if (!this.saoRenderTarget) {
      this.saoRenderTarget = new THREE.WebGLRenderTarget(width, height, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
      });
      this.saoRenderTargetFullRes = new THREE.WebGLRenderTarget(
        readBuffer.width,
        readBuffer.height,
        {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat,
        }
      );
      this.blurIntermediateRenderTarget = new THREE.WebGLRenderTarget(
        width,
        height,
        {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat,
        }
      );
      this.depth1RenderTarget = new THREE.WebGLRenderTarget(
        Math.ceil(width / 2),
        Math.ceil(height / 2),
        {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat,
        }
      );
      this.depth2RenderTarget = new THREE.WebGLRenderTarget(
        Math.ceil(width / 4),
        Math.ceil(height / 4),
        {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat,
        }
      );
      this.depth3RenderTarget = new THREE.WebGLRenderTarget(
        Math.ceil(width / 8),
        Math.ceil(height / 8),
        {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat,
        }
      );
      this.normalRenderTarget = new THREE.WebGLRenderTarget(width, height, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
      });
      this.normalRenderTargetFullRes = new THREE.WebGLRenderTarget(
        readBuffer.width,
        readBuffer.height,
        {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat,
        }
      );
    }

    if (!depthTexture && !this.depthRenderTarget) {
      this.depthRenderTarget = new THREE.WebGLRenderTarget(width, height, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
      });
      this.depthRenderTargetFullRes = new THREE.WebGLRenderTarget(
        readBuffer.width,
        readBuffer.height,
        {
          minFilter: THREE.NearestFilter,
          magFilter: THREE.NearestFilter,
          format: THREE.RGBAFormat,
        }
      );
    }

    this.updateParameters(this.camera);

    var clearColor = renderer.getClearColor(),
      clearAlpha = renderer.getClearAlpha(),
      autoClear = renderer.autoClear;
    renderer.autoClear = false;

    if (!this.renderToScreen) {
      this.copyMaterial.uniforms['tDiffuse'].value = readBuffer.texture;
      this.copyMaterial.blending = THREE.NoBlending;

      renderer.renderPass(this.copyMaterial, writeBuffer, true);
    }

    var depthPackingMode = 0;

    if (!depthTexture) {
      var oldClearColor = renderer.getClearColor(),
        oldClearAlpha = renderer.getClearAlpha();
      renderer.setClearColor(0xffffff, 1.0);

      renderer.renderOverride(
        this.depthMaterial,
        this.scene,
        this.camera,
        this.depthRenderTarget,
        true,
        false,
        true
      );

      renderer.setClearColor(0xffffff, 1.0);

      if (this.downSamplingRatio !== 1.0) {
        renderer.renderOverride(
          this.depthMaterial,
          this.scene,
          this.camera,
          this.depthRenderTargetFullRes,
          true,
          false,
          true
        );

        renderer.setClearColor(oldClearColor, oldClearAlpha);
      }
      depthTexture = this.depthRenderTarget.texture;
      depthPackingMode = 1;
    }

    if (this.depthMIPs) {
      this.depthMinifyMaterial.uniforms['tDepth'].value = depthTexture;
      this.depthMinifyMaterial.uniforms['size'].value.set(width, height);
      renderer.renderPass(
        this.depthMinifyMaterial,
        this.depth1RenderTarget,
        true
      );

      this.depthMinifyMaterial.uniforms[
        'tDepth'
      ].value = this.depth1RenderTarget.texture;
      this.depthMinifyMaterial.uniforms['size'].value.set(
        Math.ceil(width / 2),
        Math.ceil(height / 2)
      );
      renderer.renderPass(
        this.depthMinifyMaterial,
        this.depth2RenderTarget,
        true
      );

      this.depthMinifyMaterial.uniforms[
        'tDepth'
      ].value = this.depth2RenderTarget.texture;
      this.depthMinifyMaterial.uniforms['size'].value.set(
        Math.ceil(width / 4),
        Math.ceil(height / 4)
      );
      renderer.renderPass(
        this.depthMinifyMaterial,
        this.depth3RenderTarget,
        true
      );
    }

    if (this.outputOverride === 'depth') {
      this.copyMaterial.uniforms['tDiffuse'].value = depthTexture;
      this.copyMaterial.blending = THREE.NoBlending;

      renderer.renderPass(
        this.copyMaterial,
        this.renderToScreen ? null : writeBuffer,
        true
      );
      return;
    }
    if (this.outputOverride === 'depth1') {
      this.copyMaterial.uniforms[
        'tDiffuse'
      ].value = this.depth1RenderTarget.texture;
      this.copyMaterial.blending = THREE.NoBlending;

      renderer.renderPass(
        this.copyMaterial,
        this.renderToScreen ? null : writeBuffer,
        true
      );
      return;
    }
    if (this.outputOverride === 'depth2') {
      this.copyMaterial.uniforms[
        'tDiffuse'
      ].value = this.depth2RenderTarget.texture;
      this.copyMaterial.blending = THREE.NoBlending;

      renderer.renderPass(
        this.copyMaterial,
        this.renderToScreen ? null : writeBuffer,
        true
      );
      return;
    }
    if (this.outputOverride === 'depth3') {
      this.copyMaterial.uniforms[
        'tDiffuse'
      ].value = this.depth3RenderTarget.texture;
      this.copyMaterial.blending = THREE.NoBlending;

      renderer.renderPass(
        this.copyMaterial,
        this.renderToScreen ? null : writeBuffer,
        true
      );
      return;
    }

    if (!this.implicitNormals) {
      var oldClearColor = renderer.getClearColor(),
        oldClearAlpha = renderer.getClearAlpha();
      renderer.setClearColor(new THREE.Color(0.5, 0.5, 1.0), 1.0);

      renderer.renderOverride(
        this.normalMaterial,
        this.scene,
        this.camera,
        this.normalRenderTarget,
        true,
        false,
        true
      );

      if (this.downSamplingRatio !== 1.0) {
        renderer.setClearColor(new THREE.Color(0.5, 0.5, 1.0), 1.0);

        renderer.renderOverride(
          this.normalMaterial,
          this.scene,
          this.camera,
          this.normalRenderTargetFullRes,
          true,
          false,
          true
        );
      }

      renderer.setClearColor(oldClearColor, oldClearAlpha);
    }

    if (this.outputOverride === 'normal') {
      this.copyMaterial.uniforms[
        'tDiffuse'
      ].value = this.normalRenderTarget.texture;
      this.copyMaterial.blending = THREE.NoBlending;

      renderer.renderPass(
        this.copyMaterial,
        this.renderToScreen ? null : this.renderToScreen ? null : writeBuffer,
        true
      );
      return;
    }

    this.saoMaterial.defines['DEPTH_PACKING'] = depthPackingMode;
    this.saoMaterial.defines['DEPTH_MIPS'] = this.depthMIPs ? 1 : 0;
    this.saoMaterial.uniforms[
      'tNormal'
    ].value = this.normalRenderTarget.texture;
    this.saoMaterial.uniforms['tDepth'].value = depthTexture;
    if (this.depthMIPs) {
      this.saoMaterial.uniforms[
        'tDepth1'
      ].value = this.depth1RenderTarget.texture;
      this.saoMaterial.uniforms[
        'tDepth2'
      ].value = this.depth2RenderTarget.texture;
      this.saoMaterial.uniforms[
        'tDepth3'
      ].value = this.depth3RenderTarget.texture;
    }

    var oldClearColor = renderer.getClearColor(),
      oldClearAlpha = renderer.getClearAlpha();
    renderer.setClearColor(0xffffff, 1.0);

    renderer.renderPass(this.saoMaterial, this.saoRenderTarget, true); // , 0xffffff, 0.0, "sao"

    if (this.blurEnabled) {
      this.bilateralFilterMaterial.defines[
        'KERNEL_SAMPLE_RADIUS'
      ] = this.blurKernelSize;
      this.bilateralFilterMaterial.uniforms[
        'tAODepth'
      ].value = this.saoRenderTarget.texture;
      this.bilateralFilterMaterial.uniforms[
        'tAONormal'
      ].value = this.normalRenderTarget.texture;
      this.bilateralFilterMaterial.uniforms[
        'kernelDirection'
      ].value = new THREE.Vector2(1, 0);
      this.bilateralFilterMaterial.uniforms['packOutput'].value = 1;
      this.bilateralFilterMaterial.uniforms[
        'edgeSharpness'
      ].value = this.edgeSharpness;

      renderer.renderPass(
        this.bilateralFilterMaterial,
        this.blurIntermediateRenderTarget,
        true
      ); // , 0xffffff, 0.0, "sao vBlur"

      this.bilateralFilterMaterial.uniforms[
        'tAODepth'
      ].value = this.blurIntermediateRenderTarget.texture;
      this.bilateralFilterMaterial.uniforms[
        'kernelDirection'
      ].value = new THREE.Vector2(0, 1);
      this.bilateralFilterMaterial.uniforms['packOutput'].value = 0;

      renderer.renderPass(
        this.bilateralFilterMaterial,
        this.saoRenderTarget,
        true
      ); // 0xffffff, 0.0, "sao hBlur"
    }
    if (this.downSamplingRatio > 1.0) {
      //Bilateral Up sampler
      this.bilateralUpsamplerMaterial.uniforms[
        'inputTexture'
      ].value = this.saoRenderTarget.texture;
      this.bilateralUpsamplerMaterial.uniforms[
        'NormalTextureFullRes'
      ].value = this.normalRenderTargetFullRes.texture;
      this.bilateralUpsamplerMaterial.uniforms[
        'DepthTextureFullRes'
      ].value = this.depthRenderTargetFullRes.texture;
      this.bilateralUpsamplerMaterial.uniforms[
        'NormalTextureHalfRes'
      ].value = this.normalRenderTarget.texture;
      this.bilateralUpsamplerMaterial.uniforms[
        'DepthTextureHalfRes'
      ].value = this.depthRenderTarget.texture;
      this.bilateralUpsamplerMaterial.uniforms[
        'texSize'
      ].value = new THREE.Vector2(
        this.saoRenderTarget.width,
        this.saoRenderTarget.height
      );
      this.bilateralUpsamplerMaterial.uniforms[
        'cameraNearFar'
      ].value = new THREE.Vector2(this.camera.near, this.camera.far);
      renderer.renderPass(
        this.bilateralUpsamplerMaterial,
        this.saoRenderTargetFullRes,
        true
      ); // 0xffffff, 0.0, "sao hBlur"
    }
    renderer.setClearColor(oldClearColor, oldClearAlpha);

    if (this.outputOverride === 'sao') {
      this.copyMaterial.uniforms['tDiffuse'].value =
        this.downSamplingRatio > 1.0
          ? this.saoRenderTargetFullRes.texture
          : this.saoRenderTarget.texture;
      this.copyMaterial.blending = THREE.NoBlending;

      renderer.renderPass(
        this.copyMaterial,
        this.renderToScreen ? null : writeBuffer,
        true
      );
      return;
    }

    renderer.autoClear = false;

    this.copyMaterial.uniforms['tDiffuse'].value =
      this.downSamplingRatio > 1.0
        ? this.saoRenderTargetFullRes.texture
        : this.saoRenderTarget.texture;
    this.copyMaterial.blending = THREE.MultiplyBlending;
    this.copyMaterial.premultipliedAlpha = true;

    renderer.renderPass(
      this.copyMaterial,
      this.renderToScreen ? null : writeBuffer,
      false
    );

    renderer.autoClear = autoClear;
    renderer.setClearColor(clearColor);
    renderer.setClearAlpha(clearAlpha);
  },

  getBilateralUpsamplerMaterial: function(kernelRadius) {
    return new THREE.ShaderMaterial({
      uniforms: {
        inputTexture: { value: null },
        NormalTextureFullRes: { value: null },
        DepthTextureFullRes: { value: null },
        NormalTextureHalfRes: { value: null },
        DepthTextureHalfRes: { value: null },
        texSize: { value: new THREE.Vector2(0.5, 0.5) },
        cameraNearFar: { value: new THREE.Vector2(0.5, 0.5) },
      },

      vertexShader:
        'varying vec2 vUv;\n\
				void main() {\n\
					vUv = uv;\n\
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\
				}',

      fragmentShader:
        '#include <common>\n\
				#include <packing>\n\
				varying vec2 vUv;\n\
				uniform sampler2D inputTexture;\n\
				uniform sampler2D NormalTextureFullRes;\n\
				uniform sampler2D DepthTextureFullRes;\n\
				uniform sampler2D NormalTextureHalfRes;\n\
				uniform sampler2D DepthTextureHalfRes;\n\
				uniform vec2 texSize;\
				uniform vec2 cameraNearFar;\
				\
				void main()\
				{\
					vec2 uvOffsets[4];\
					uvOffsets[0] = vUv + vec2(0.0, 1.0)/texSize;\
					uvOffsets[1] = vUv + vec2(1.0, 0.0)/texSize;\
					uvOffsets[2] = vUv + vec2(-1.0, 0.0)/texSize;\
					uvOffsets[3] = vUv + vec2(0.0, -1.0)/texSize;\
					\
					float depth_weights[4];\
					float depth_hires = unpackRGBAToDepth(texture2D(DepthTextureFullRes, vUv));\
					depth_hires = -perspectiveDepthToViewZ(depth_hires, cameraNearFar.x, cameraNearFar.y);\
					if(depth_hires == 1.0)\
						discard;\
					float depth_coarse1 = unpackRGBAToDepth(texture2D(DepthTextureHalfRes, uvOffsets[0]));\
					depth_coarse1 = -perspectiveDepthToViewZ(depth_coarse1, cameraNearFar.x, cameraNearFar.y);\
					depth_weights[0] = 1.0 / (0.001 + abs(depth_hires-depth_coarse1));\
					float depth_coarse2 = unpackRGBAToDepth(texture2D(DepthTextureHalfRes, uvOffsets[1]));\
					depth_coarse2 = -perspectiveDepthToViewZ(depth_coarse2, cameraNearFar.x, cameraNearFar.y);\
					depth_weights[1] = 1.0 / (0.001 + abs(depth_hires-depth_coarse2));\
					float depth_coarse3 = unpackRGBAToDepth(texture2D(DepthTextureHalfRes, uvOffsets[2]));\
					depth_coarse3 = -perspectiveDepthToViewZ(depth_coarse3, cameraNearFar.x, cameraNearFar.y);\
					depth_weights[2] = 1.0 / (0.001 + abs(depth_hires-depth_coarse3));\
					float depth_coarse4 = unpackRGBAToDepth(texture2D(DepthTextureHalfRes, uvOffsets[3]));\
					depth_coarse4 = -perspectiveDepthToViewZ(depth_coarse4, cameraNearFar.x, cameraNearFar.y);\
					depth_weights[3] = 1.0 / (0.001 + abs(depth_hires-depth_coarse4));\
					\
					float norm_weights[4];\
					vec3 norm_fullRes = unpackRGBToNormal(texture2D(NormalTextureFullRes, vUv).rgb);\
					vec3 norm_coarse1 = unpackRGBToNormal(texture2D(NormalTextureHalfRes, uvOffsets[0]).rgb);\
					norm_weights[0] = pow(abs(dot(norm_coarse1, norm_fullRes)), 32.0);\
					vec3 norm_coarse2 = unpackRGBToNormal(texture2D(NormalTextureHalfRes, uvOffsets[1]).rgb);\
					norm_weights[1] = pow(abs(dot(norm_coarse2, norm_fullRes)), 32.0);\
					vec3 norm_coarse3 = unpackRGBToNormal(texture2D(NormalTextureHalfRes, uvOffsets[2]).rgb);\
					norm_weights[2] = pow(abs(dot(norm_coarse3, norm_fullRes)), 32.0);\
					vec3 norm_coarse4 = unpackRGBToNormal(texture2D(NormalTextureHalfRes, uvOffsets[3]).rgb);\
					norm_weights[3] = pow(abs(dot(norm_coarse4, norm_fullRes)), 32.0);\
					\
					vec3 colorOut = vec3(0.0);\
					float weight_sum = 0.0;\
					float weight = norm_weights[0] * depth_weights[0];\
					colorOut += texture2D(inputTexture, uvOffsets[0]).rgb*weight;\
					weight_sum += weight;\
				  weight = norm_weights[1] * depth_weights[1];\
					colorOut += texture2D(inputTexture, uvOffsets[1]).rgb*weight;\
					weight_sum += weight;\
				  weight = norm_weights[2] * depth_weights[2];\
					colorOut += texture2D(inputTexture, uvOffsets[2]).rgb*weight;\
					weight_sum += weight;\
				  weight = norm_weights[3] * depth_weights[3];\
					colorOut += texture2D(inputTexture, uvOffsets[3]).rgb*weight;\
					weight_sum += weight;\
					colorOut /= weight_sum;\
					gl_FragColor = vec4(colorOut, 1.0);\
				}',
    });
  },
};

// File:examples/js/postprocessing/SSAARenderPass.js

/**
*
* Supersample Anti-Aliasing Render Pass
*
* @author bhouston / http://clara.io/
*
* This manual approach to SSAA re-renders the scene ones for each sample with camera jitter and accumulates the results.
*
* References: https://en.wikipedia.org/wiki/Supersampling
*
*/

THREE.SSAARenderPass = function(scene, camera, clearColor, clearAlpha) {
  THREE.Pass.call(this);

  this.scene = scene;
  this.camera = camera;

  this.sampleLevel = 4; // specified as n, where the number of samples is 2^n, so sampleLevel = 4, is 2^4 samples, 16.
  this.unbiased = true;

  this.needsSwap = false;

  // as we need to clear the buffer in this pass, clearColor must be set to something, defaults to black.
  this.clearColor = clearColor !== undefined ? clearColor : 0x000000;
  this.clearAlpha = clearAlpha !== undefined ? clearAlpha : 0;

  if (THREE.CopyShader === undefined)
    console.error('THREE.SSAARenderPass relies on THREE.CopyShader');

  this.overMaterial = new THREE.ShaderMaterial(THREE.CopyShader);
  this.overMaterial.uniforms = THREE.UniformsUtils.clone(
    this.overMaterial.uniforms
  );
  this.overMaterial.blending = THREE.NormalBlending;
  this.overMaterial.premultipliedAlpha = true;
  this.overMaterial.transparent = true;
  this.overMaterial.depthTest = false;
  this.overMaterial.depthWrite = false;

  this.addMaterial = new THREE.ShaderMaterial(THREE.CopyShader);
  this.addMaterial.uniforms = THREE.UniformsUtils.clone(
    this.addMaterial.uniforms
  );
  this.addMaterial.blending = THREE.AdditiveBlending;
  this.addMaterial.premultipliedAlpha = true;
  this.addMaterial.transparent = true;
  this.addMaterial.depthTest = false;
  this.addMaterial.depthWrite = false;

  this.camera2 = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  this.scene2 = new THREE.Scene();
  this.quad2 = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.copyMaterial);
  this.quad2.frustumCulled = false; // Avoid getting clipped
  this.scene2.add(this.quad2);
};

THREE.SSAARenderPass.prototype = Object.assign(
  Object.create(THREE.Pass.prototype),
  {
    constructor: THREE.SSAARenderPass,

    dispose: function() {
      if (this.sampleRenderTarget) {
        this.sampleRenderTarget.dispose();
        this.sampleRenderTarget = null;
      }
    },

    setSize: function(width, height) {
      if (this.sampleRenderTarget)
        this.sampleRenderTarget.setSize(width, height);
    },

    render: function(renderer, writeBuffer, readBuffer, delta, maskActive) {
      if (!this.sampleRenderTarget) {
        this.sampleRenderTarget = new THREE.WebGLRenderTarget(
          readBuffer.width,
          readBuffer.height,
          {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType,
            name: 'SSAARenderPass.sample',
          }
        );
      }

      var jitterOffsets =
        THREE.SSAARenderPass.JitterVectors[
          Math.max(0, Math.min(this.sampleLevel, 5))
        ];

      var autoClear = renderer.autoClear;
      renderer.autoClear = false;

      var oldClearColor = renderer.getClearColor().getHex();
      var oldClearAlpha = renderer.getClearAlpha();

      var baseSampleWeight = 1.0 / jitterOffsets.length;
      var roundingRange = 1 / 32;

      this.addMaterial.uniforms[
        'tDiffuse'
      ].value = this.sampleRenderTarget.texture;

      var width = readBuffer.width,
        height = readBuffer.height;

      renderer.setClearColor(0x000000, 0);

      var oldDitherScale = renderer.ditherScale;
      if (this.unbiased) {
        renderer.ditherScale = jitterOffsets.length;
      }

      // render the scene multiple times, each slightly jitter offset from the last and accumulate the results.
      for (var i = 0; i < jitterOffsets.length; i++) {
        var jitterOffset = jitterOffsets[i];
        if (this.camera.setViewOffset) {
          this.camera.setViewOffset(
            width,
            height,
            jitterOffset[0] * 0.0625,
            jitterOffset[1] * 0.0625, // 0.0625 = 1 / 16
            width,
            height
          );
        }

        var sampleWeight = baseSampleWeight;
        if (this.unbiased) {
          // the theory is that equal weights for each sample lead to an accumulation of rounding errors.
          // The following equation varies the sampleWeight per sample so that it is uniformly distributed
          // across a range of values whose rounding errors cancel each other out.
          var uniformCenteredDistribution =
            -0.5 + (i + 0.5) / jitterOffsets.length;
          sampleWeight += roundingRange * uniformCenteredDistribution;
        }

        this.addMaterial.uniforms['opacity'].value = sampleWeight;
        renderer.render(this.scene, this.camera, this.sampleRenderTarget, true);

        renderer.renderPass(this.addMaterial, writeBuffer, i === 0);
      }

      if (this.camera.clearViewOffset) this.camera.clearViewOffset();

      renderer.ditherScale = oldDitherScale;

      this.overMaterial.uniforms['tDiffuse'].value = writeBuffer.texture;

      renderer.setClearColor(this.clearColor, this.clearAlpha);
      renderer.renderPass(
        this.overMaterial,
        this.renderToScreen ? null : readBuffer,
        this.clear
      );

      renderer.autoClear = autoClear;
      renderer.setClearColor(oldClearColor, oldClearAlpha);
    },
  }
);

// These jitter vectors are specified in integers because it is easier.
// I am assuming a [-8,8) integer grid, but it needs to be mapped onto [-0.5,0.5)
// before being used, thus these integers need to be scaled by 1/16.
//
// Sample patterns reference: https://msdn.microsoft.com/en-us/library/windows/desktop/ff476218%28v=vs.85%29.aspx?f=255&MSPPError=-2147217396
THREE.SSAARenderPass.JitterVectors = [
  [[0, 0]],
  [[4, 4], [-4, -4]],
  [[-2, -6], [6, -2], [-6, 2], [2, 6]],
  [[1, -3], [-1, 3], [5, 1], [-3, -5], [-5, 5], [-7, -1], [3, 7], [7, -7]],
  [
    [1, 1],
    [-1, -3],
    [-3, 2],
    [4, -1],
    [-5, -2],
    [2, 5],
    [5, 3],
    [3, -5],
    [-2, 6],
    [0, -7],
    [-4, -6],
    [-6, 4],
    [-8, 0],
    [7, -4],
    [6, 7],
    [-7, -8],
  ],
  [
    [-4, -7],
    [-7, -5],
    [-3, -5],
    [-5, -4],
    [-1, -4],
    [-2, -2],
    [-6, -1],
    [-4, 0],
    [-7, 1],
    [-1, 2],
    [-6, 3],
    [-3, 3],
    [-7, 6],
    [-3, 6],
    [-5, 7],
    [-1, 7],
    [5, -7],
    [1, -6],
    [6, -5],
    [4, -4],
    [2, -3],
    [7, -2],
    [1, -1],
    [4, -1],
    [2, 1],
    [6, 2],
    [0, 4],
    [4, 4],
    [2, 5],
    [7, 5],
    [5, 6],
    [3, 7],
  ],
];
// File:examples/js/postprocessing/ClearPass.js

/**
 * @author mrdoob / http://mrdoob.com/
 */

THREE.ClearPass = function(clearColor, clearAlpha) {
  THREE.Pass.call(this);

  this.needsSwap = false;

  this.clearColor = clearColor !== undefined ? clearColor : 0x000000;
  this.clearAlpha = clearAlpha !== undefined ? clearAlpha : 0;
};

THREE.ClearPass.prototype = Object.assign(Object.create(THREE.Pass.prototype), {
  constructor: THREE.ClearPass,

  render: function(renderer, writeBuffer, readBuffer, delta, maskActive) {
    var oldClearColor, oldClearAlpha;

    if (this.clearColor !== undefined) {
      oldClearColor = renderer.getClearColor().getHex();
      oldClearAlpha = renderer.getClearAlpha();

      renderer.setClearColor(this.clearColor, this.clearAlpha);
    }

    renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
    renderer.clear();

    if (this.clearColor) {
      renderer.setClearColor(oldClearColor, oldClearAlpha);
    }
  },
});

// File:examples/js/postprocessing/TexturePass.js

/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.TexturePass = function(map, opacity) {
  THREE.Pass.call(this);

  if (THREE.CopyShader === undefined)
    console.error('THREE.TexturePass relies on THREE.CopyShader');

  var shader = THREE.CopyShader;

  this.map = map;
  this.opacity = opacity !== undefined ? opacity : 1.0;

  this.uniforms = THREE.UniformsUtils.clone(shader.uniforms);

  this.material = new THREE.ShaderMaterial({
    uniforms: this.uniforms,
    vertexShader: shader.vertexShader,
    fragmentShader: shader.fragmentShader,
    depthTest: false,
    depthWrite: false,
  });

  this.needsSwap = false;

  this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  this.scene = new THREE.Scene();

  this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null);
  this.quad.frustumCulled = false; // Avoid getting clipped
  this.scene.add(this.quad);
};

THREE.TexturePass.prototype = Object.assign(
  Object.create(THREE.Pass.prototype),
  {
    constructor: THREE.TexturePass,

    render: function(renderer, writeBuffer, readBuffer, delta, maskActive) {
      var oldAutoClear = renderer.autoClear;
      renderer.autoClear = false;

      this.quad.material = this.material;

      this.uniforms['opacity'].value = this.opacity;
      this.uniforms['tDiffuse'].value = this.map;
      this.material.transparent = this.opacity < 1.0;

      if (this.map) {
        var rectSize = renderer.getSize();
        var width = this.map.image.width / rectSize.width || 1;
        var height = this.map.image.height / rectSize.height || 1;
        var min = Math.min(width, height);
        width = 1 / min * width;
        height = 1 / min * height;
        this.quad.scale.set(width, height, 1);
      }

      renderer.render(
        this.scene,
        this.camera,
        this.renderToScreen ? null : readBuffer,
        this.clear
      );

      renderer.autoClear = oldAutoClear;
    },
  }
);

// File:examples/js/postprocessing/CubeTexturePass.js

/**
 * @author bhouston / http://clara.io/
 */

THREE.CubeTexturePass = function(camera, envMap, opacity) {
  THREE.Pass.call(this);

  this.camera = camera;

  this.needsSwap = false;

  this.cubeMaterial = new THREE.MeshCubeMaterial();

  this.cubeMesh = new THREE.Mesh(
    new THREE.BoxBufferGeometry(10, 10, 10),
    this.cubeMaterial
  );

  this.envMap = envMap;
  this.envMapIntensity = 1.0;
  this.opacity = opacity !== undefined ? opacity : 1.0;
  this.roughness = 0.0;

  this.cubeScene = new THREE.Scene();
  this.cubeCamera = new THREE.PerspectiveCamera();
  this.cubeScene.add(this.cubeMesh);
};

THREE.CubeTexturePass.prototype = Object.assign(
  Object.create(THREE.Pass.prototype),
  {
    constructor: THREE.CubeTexturePass,

    render: function(renderer, writeBuffer, readBuffer, delta, maskActive) {
      var oldAutoClear = renderer.autoClear;
      renderer.autoClear = false;

      this.cubeCamera.projectionMatrix.copy(this.camera.projectionMatrix);
      this.cubeCamera.quaternion.setFromRotationMatrix(this.camera.matrixWorld);

      if (this.cubeMaterial.envMap != this.envMap) {
        this.cubeMaterial.envMap = this.envMap;
        this.cubeMaterial.needsUpdate = true;
      }
      this.cubeMaterial.envMapIntensity = this.envMapIntensity;
      this.cubeMaterial.roughness = this.roughness;
      this.cubeMaterial.opacity = this.opacity;
      this.cubeMaterial.transparent = this.opacity < 1.0;

      renderer.render(
        this.cubeScene,
        this.cubeCamera,
        this.renderToScreen ? null : readBuffer,
        this.clear
      );

      renderer.autoClear = oldAutoClear;
    },
  }
);

// File:examples/js/postprocessing/DofPass.js

/**
 * @author spidersharma03 / http://eduperiment.com/
 */

THREE.DofPass = function(resolution, scene, camera) {
  THREE.Pass.call(this);

  var resolution =
    resolution !== undefined ? resolution : new THREE.Vector2(256, 256);
  // render targets
  this.downSampleRes = new THREE.Vector2(
    Math.round(resolution.x / 2),
    Math.round(resolution.y / 2)
  );

  var pars = {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
  };

  this.renderTargetColorDownSample = new THREE.WebGLRenderTarget(
    this.downSampleRes.x,
    this.downSampleRes.y,
    pars
  );
  this.renderTargetColorDownSample.texture.generateMipmaps = false;

  this.renderTargetCoCDownSample = new THREE.WebGLRenderTarget(
    this.downSampleRes.x,
    this.downSampleRes.y,
    pars
  );
  this.renderTargetCoCDownSample.texture.generateMipmaps = false;

  this.renderTargetBlurTemp = new THREE.WebGLRenderTarget(
    this.downSampleRes.x,
    this.downSampleRes.y,
    pars
  );
  this.renderTargetBlurTemp.texture.generateMipmaps = false;

  var pars = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  };

  this.renderTargetDofBlur = new THREE.WebGLRenderTarget(
    this.downSampleRes.x,
    this.downSampleRes.y,
    pars
  );
  this.renderTargetDofBlur.texture.generateMipmaps = false;
  this.renderTargetDofBlurTemp = new THREE.WebGLRenderTarget(
    this.downSampleRes.x,
    this.downSampleRes.y,
    pars
  );
  this.renderTargetDofBlurTemp.texture.generateMipmaps = false;

  this.renderTargetDofCombine = new THREE.WebGLRenderTarget(
    resolution.x,
    resolution.y,
    pars
  );
  this.renderTargetDofCombine.texture.generateMipmaps = false;

  this.needsSwap = false;
  this.oldClearColor = new THREE.Color();
  this.oldClearAlpha = 1;

  this.renderCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  this.renderScene = new THREE.Scene();

  this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null);
  this.renderScene.add(this.quad);

  this.focalDistance = 10.0;
  this.cameraNear = 0.1;
  this.cameraFar = 100;
  this.NearFarBlurScale = new THREE.Vector2(0.1, 0.5);

  this.downSamplingMaterial = this.getColorDownSamplingMaterial();

  this.cocMaterial = this.getCoCMaterial();
  this.cocMaterial.uniforms['NearFarBlurScale'].value = this.NearFarBlurScale;
  this.cocMaterial.uniforms['cameraNearFar'].value = new THREE.Vector2(
    camera.near,
    camera.far
  );
  this.cocMaterial.uniforms['focalDistance'].value = this.focalDistance;

  this.dilateNearCocMaterial = this.getDilateNearCocMaterial();
  this.dilateNearCocMaterial.uniforms[
    'NearFarBlurScale'
  ].value = this.NearFarBlurScale;

  this.dofBlurType = 1;
  this.dofBlurMaterial =
    this.dofBlurType === 0
      ? this.getDofBlurCircularMaterial()
      : this.getDofBlurSeperableMaterial();

  this.dofCombineMaterial = this.getDofCombineMaterial();
  this.dofCombineMaterial.uniforms[
    'NearFarBlurScale'
  ].value = this.NearFarBlurScale;
  this.dofCombineMaterial.uniforms['cameraNearFar'].value = new THREE.Vector2(
    camera.near,
    camera.far
  );
  this.dofCombineMaterial.uniforms['focalDistance'].value = this.focalDistance;

  if (THREE.CopyShader === undefined)
    console.error('THREE.DofPass relies on THREE.CopyShader');

  var copyShader = THREE.CopyShader;

  this.copyUniforms = THREE.UniformsUtils.clone(copyShader.uniforms);
  this.materialCopy = new THREE.ShaderMaterial({
    uniforms: this.copyUniforms,
    vertexShader: copyShader.vertexShader,
    fragmentShader: copyShader.fragmentShader,
  });

  this.depthMaterial = new THREE.MeshDepthMaterial();
  this.depthMaterial.side = THREE.DoubleSide;
  this.depthMaterial.depthPacking = THREE.RGBADepthPacking;
  this.depthMaterial.blending = THREE.NoBlending;
  this.depthRenderTarget = new THREE.WebGLRenderTarget(
    resolution.x,
    resolution.y,
    {
      minFilter: THREE.NearesFilter,
      magFilter: THREE.NearesFilter,
      format: THREE.RGBAFormat,
    }
  );
  this.scene = scene;
  this.camera = camera;
};

THREE.DofPass.prototype = Object.assign(Object.create(THREE.Pass.prototype), {
  constructor: THREE.DofPass,

  setSize: function(width, height) {
    this.downSampleRes = new THREE.Vector2(
      Math.round(width / 2),
      Math.round(height / 2)
    );

    var resx = this.downSampleRes.x;
    var resy = this.downSampleRes.y;

    this.renderTargetColorDownSample.setSize(resx, resy);
    this.renderTargetCoCDownSample.setSize(resx, resy);
    this.renderTargetBlurTemp.setSize(resx, resy);
    this.renderTargetDofBlur.setSize(resx, resy);
    this.renderTargetDofBlurTemp.setSize(resx, resy);
    this.renderTargetDofCombine.setSize(width, height);
    this.depthRenderTarget.setSize(width, height);
  },

  changeBlurType: function(blurType) {
    this.dofBlurType = blurType;
    this.dofBlurMaterial =
      this.dofBlurType === 0
        ? this.getDofBlurCircularMaterial()
        : this.getDofBlurSeperableMaterial();
  },

  render: function(renderer, writeBuffer, readBuffer, delta, maskActive) {
    this.dilateNearCocMaterial.uniforms['texSize'].value = this.downSampleRes;
    this.dofBlurMaterial.uniforms['texSize'].value = this.downSampleRes;
    this.dofCombineMaterial.uniforms['texSize'].value = this.downSampleRes;

    this.cocMaterial.uniforms['focalDistance'].value = this.focalDistance;
    this.cocMaterial.uniforms['cameraNearFar'].value.x = this.cameraNear;
    this.cocMaterial.uniforms['cameraNearFar'].value.y = this.cameraFar;

    this.dofCombineMaterial.uniforms[
      'focalDistance'
    ].value = this.focalDistance;
    this.dofCombineMaterial.uniforms['cameraNearFar'].value.x = this.cameraNear;
    this.dofCombineMaterial.uniforms['cameraNearFar'].value.y = this.cameraFar;

    this.oldClearColor.copy(renderer.getClearColor());
    this.oldClearAlpha = renderer.getClearAlpha();
    var oldAutoClear = renderer.autoClear;
    renderer.autoClear = true;

    if (maskActive) renderer.context.disable(renderer.context.STENCIL_TEST);

    // Render Scene into depth buffer. This is temporary and should not be done here.
    this.scene.overrideMaterial = this.depthMaterial;
    renderer.setClearColor(0xffffff, 1);
    renderer.render(this.scene, this.camera, this.depthRenderTarget);
    this.scene.overrideMaterial = null;

    // 1. Downsample the Original texture, and store coc in the alpha channel
    this.quad.material = this.downSamplingMaterial;
    this.downSamplingMaterial.uniforms['colorTexture'].value =
      readBuffer.texture;
    renderer.render(
      this.renderScene,
      this.renderCamera,
      this.renderTargetColorDownSample
    );

    this.quad.material = this.cocMaterial;
    this.cocMaterial.uniforms[
      'depthTexture'
    ].value = this.depthRenderTarget.texture;
    renderer.render(
      this.renderScene,
      this.renderCamera,
      this.renderTargetCoCDownSample
    );

    // 2. Dilate/Blur Near field coc
    this.quad.material = this.dilateNearCocMaterial;
    this.dilateNearCocMaterial.uniforms[
      'cocTexture'
    ].value = this.renderTargetCoCDownSample.texture;
    this.dilateNearCocMaterial.uniforms[
      'depthTexture'
    ].value = this.depthRenderTarget.texture;
    this.dilateNearCocMaterial.uniforms['direction'].value = new THREE.Vector2(
      1,
      0
    );
    renderer.render(
      this.renderScene,
      this.renderCamera,
      this.renderTargetBlurTemp
    );
    this.dilateNearCocMaterial.uniforms[
      'cocTexture'
    ].value = this.renderTargetBlurTemp.texture;
    this.dilateNearCocMaterial.uniforms['direction'].value = new THREE.Vector2(
      0,
      1
    );
    renderer.render(
      this.renderScene,
      this.renderCamera,
      this.renderTargetCoCDownSample
    );

    // 3. Blur Dof
    if (this.dofBlurType === 0) {
      this.quad.material = this.dofBlurMaterial;
      this.dofBlurMaterial.uniforms[
        'cocTexture'
      ].value = this.renderTargetCoCDownSample.texture;
      this.dofBlurMaterial.uniforms[
        'colorTexture'
      ].value = this.renderTargetDownSample.texture;
      this.dofBlurMaterial.uniforms[
        'depthTexture'
      ].value = this.depthRenderTarget.texture;
      renderer.render(
        this.renderScene,
        this.renderCamera,
        this.renderTargetDofBlurTemp
      );
    } else {
      this.quad.material = this.dofBlurMaterial;
      this.dofBlurMaterial.uniforms[
        'cocTexture'
      ].value = this.renderTargetCoCDownSample.texture;
      this.dofBlurMaterial.uniforms[
        'colorTexture'
      ].value = this.renderTargetColorDownSample.texture;
      this.dofBlurMaterial.uniforms['direction'].value = new THREE.Vector2(
        1,
        0
      );
      renderer.render(
        this.renderScene,
        this.renderCamera,
        this.renderTargetDofBlur
      );
      this.dofBlurMaterial.uniforms[
        'colorTexture'
      ].value = this.renderTargetDofBlur.texture;
      this.dofBlurMaterial.uniforms['direction'].value = new THREE.Vector2(
        0,
        1
      );
      renderer.render(
        this.renderScene,
        this.renderCamera,
        this.renderTargetDofBlurTemp
      );
    }
    // 4. Dof Combine
    this.quad.material = this.dofCombineMaterial;
    this.dofCombineMaterial.uniforms[
      'cocTexture'
    ].value = this.renderTargetCoCDownSample.texture;
    this.dofCombineMaterial.uniforms['colorTexture'].value = readBuffer.texture;
    this.dofCombineMaterial.uniforms[
      'depthTexture'
    ].value = this.depthRenderTarget.texture;
    this.dofCombineMaterial.uniforms[
      'blurTexture'
    ].value = this.renderTargetDofBlurTemp.texture;
    renderer.render(
      this.renderScene,
      this.renderCamera,
      this.renderTargetDofCombine
    );

    // Copy Pass
    this.quad.material = this.materialCopy;
    this.copyUniforms['tDiffuse'].value = this.renderTargetDofCombine.texture;

    if (maskActive) renderer.context.enable(renderer.context.STENCIL_TEST);
    renderer.render(this.renderScene, this.renderCamera, readBuffer);

    renderer.setClearColor(this.oldClearColor, this.oldClearAlpha);
    renderer.autoClear = oldAutoClear;
  },

  getColorDownSamplingMaterial: function() {
    return new THREE.ShaderMaterial({
      uniforms: {
        colorTexture: { value: null },
      },

      vertexShader:
        'varying vec2 vUv;\n\
				void main() {\n\
					vUv = uv;\n\
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\
				}',

      fragmentShader:
        '#include <common>\n\
				#include <packing>\n\
				varying vec2 vUv;\n\
				uniform sampler2D colorTexture;\n\
				\
				void main() {\n\
					gl_FragColor = texture2D(colorTexture, vUv);\n\
				}',
    });
  },

  getCoCMaterial: function() {
    return new THREE.ShaderMaterial({
      uniforms: {
        depthTexture: { value: null },
        NearFarBlurScale: { value: new THREE.Vector2(0.5, 0.5) },
        cameraNearFar: { value: new THREE.Vector2(0.1, 100) },
        focalDistance: { value: 1.0 },
      },

      vertexShader:
        'varying vec2 vUv;\n\
				void main() {\n\
					vUv = uv;\n\
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\
				}',

      fragmentShader:
        '#include <common>\n\
				#include <packing>\n\
				varying vec2 vUv;\n\
				uniform sampler2D depthTexture;\n\
				uniform vec2 NearFarBlurScale;\
				uniform vec2 cameraNearFar;\
				uniform float focalDistance;\
				const float MAXIMUM_BLUR_SIZE = 8.0;\
				\
				float computeCoc() {\
					vec4 packDepth = texture2D(depthTexture, vUv).rgba;\
					if(packDepth.x == 1.0) return max(NearFarBlurScale.x, NearFarBlurScale.y);\
						float depth = unpackRGBAToDepth(packDepth);\
						depth = -perspectiveDepthToViewZ(depth, cameraNearFar.x, cameraNearFar.y);\
						float coc = (depth - focalDistance)/depth;\
					return (coc > 0.0 ? coc * NearFarBlurScale.y : coc * NearFarBlurScale.x);\
				}\
				\
				void main() {\n\
					gl_FragColor = vec4(0.0, 0.0, 0.0, computeCoc());\n\
				}',
    });
  },

  getDilateNearCocMaterial: function() {
    return new THREE.ShaderMaterial({
      uniforms: {
        cocTexture: { value: null },
        depthTexture: { value: null },
        NearFarBlurScale: { value: new THREE.Vector2(0.5, 0.5) },
        texSize: { value: new THREE.Vector2(0.5, 0.5) },
        direction: { value: new THREE.Vector2(1, 0) },
      },

      vertexShader:
        'varying vec2 vUv;\n\
				void main() {\n\
					vUv = uv;\n\
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\
				}',

      fragmentShader:
        '#include <common>\n\
				varying vec2 vUv;\n\
				uniform sampler2D cocTexture;\n\
				uniform sampler2D depthTexture;\n\
				uniform vec2 direction;\
				uniform vec2 texSize;\
				uniform vec2 NearFarBlurScale;\
				const float MAXIMUM_BLUR_SIZE = 8.0;\
				\
				float expandNear(const in vec2 offset, const in bool isBackground) {\
					float coc = 0.0;\
					vec2 sampleOffsets = MAXIMUM_BLUR_SIZE * offset / 5.0;\
					float coc0 = texture2D(cocTexture, vUv).a;\
					float coc1 = texture2D(cocTexture, vUv - 5.0 * sampleOffsets).a;\
					float coc2 = texture2D(cocTexture, vUv - 4.0 * sampleOffsets).a;\
					float coc3 = texture2D(cocTexture, vUv - 3.0 * sampleOffsets).a;\
					float coc4 = texture2D(cocTexture, vUv - 2.0 * sampleOffsets).a;\
					float coc5 = texture2D(cocTexture, vUv - 1.0 * sampleOffsets).a;\
					float coc6 = texture2D(cocTexture, vUv + 1.0 * sampleOffsets).a;\
					float coc7 = texture2D(cocTexture, vUv + 2.0 * sampleOffsets).a;\
					float coc8 = texture2D(cocTexture, vUv + 3.0 * sampleOffsets).a;\
					float coc9 = texture2D(cocTexture, vUv + 4.0 * sampleOffsets).a;\
					float coc10 = texture2D(cocTexture, vUv + 5.0 * sampleOffsets).a;\
						\
					if(isBackground){\
						coc = abs(coc0) * 0.095474 + \
						(abs(coc1) + abs(coc10)) * 0.084264 + \
						(abs(coc2) + abs(coc9)) * 0.088139 + \
						(abs(coc3) + abs(coc8)) * 0.091276 + \
						(abs(coc4) + abs(coc7)) * 0.093585 + \
						(abs(coc5) + abs(coc6)) * 0.094998;\
					} else {\
						coc = min(coc0, 0.0);\
						coc = min(coc1 * 0.3, coc);\
						coc = min(coc2 * 0.5, coc);\
						coc = min(coc3 * 0.75, coc);\
						coc = min(coc4 * 0.8, coc);\
						coc = min(coc5 * 0.95, coc);\
						coc = min(coc6 * 0.95, coc);\
						coc = min(coc7 * 0.8, coc);\
						coc = min(coc8 * 0.75, coc);\
						coc = min(coc9 * 0.5, coc);\
						coc = min(coc10 * 0.3, coc);\
						if(abs(coc0) > abs(coc))\
							coc = coc0;\
					}\
					return coc;\
				}\
				\
				void main() {\n\
					vec2 offset = direction/texSize;\
					float coc = expandNear(offset, texture2D(depthTexture, vUv).x == 1.0);\
					gl_FragColor = vec4(0.0, 0.0, 0.0, coc);\n\
				}',
    });
  },

  getDofBlurCircularMaterial: function() {
    return new THREE.ShaderMaterial({
      uniforms: {
        colorTexture: { value: null },
        cocTexture: { value: null },
        depthTexture: { value: null },
        texSize: { value: new THREE.Vector2(0.5, 0.5) },
      },

      vertexShader:
        'varying vec2 vUv;\n\
				void main() {\n\
					vUv = uv;\n\
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\
				}',

      fragmentShader:
        '#include <common>\n\
				varying vec2 vUv;\n\
				uniform sampler2D colorTexture;\n\
				uniform sampler2D cocTexture;\n\
				uniform sampler2D depthTexture;\n\
				uniform vec2 texSize;\
				const float MAXIMUM_BLUR_SIZE = 8.0;\
				\
				vec4 CircularBlur() {\
					\
					const int NUM_SAMPLES = 16;\
					vec2 poisson_disk_samples[NUM_SAMPLES];\
					poisson_disk_samples[0] = vec2(-0.399691779231, 0.728591545584);\
					poisson_disk_samples[1] = vec2(-0.48622557676, -0.84016533712);\
					poisson_disk_samples[2] = vec2(0.770309468987, -0.24906070432);\
					poisson_disk_samples[3] = vec2(0.556596796154, 0.820359876432);\
					poisson_disk_samples[4] = vec2(-0.933902004071, 0.0600539051593);\
					poisson_disk_samples[5] = vec2(0.330144964342, 0.207477293384);\
					poisson_disk_samples[6] = vec2(0.289013230975, -0.686749271417);\
					poisson_disk_samples[7] = vec2(-0.0832470893559, -0.187351643125);\
					poisson_disk_samples[8] = vec2(-0.296314525615, 0.254474834305);\
					poisson_disk_samples[9] = vec2(-0.850977666059, 0.484642744689);\
					poisson_disk_samples[10] = vec2(0.829287915319, 0.2345063545);\
					poisson_disk_samples[11] = vec2(-0.773042143899, -0.543741521254);\
					poisson_disk_samples[12] = vec2(0.0561133030864, 0.928419742597);\
					poisson_disk_samples[13] = vec2(-0.205799249508, -0.562072714492);\
					poisson_disk_samples[14] = vec2(-0.526991665882, -0.193690188118);\
					poisson_disk_samples[15] = vec2(-0.051789270667, -0.935374050821);\
						\
					vec4 cocr = texture2D(cocTexture, vUv);\
						\
					float blurDist = MAXIMUM_BLUR_SIZE * coc.a;\
						\
					float rnd = PI2 * rand( vUv );\
					float costheta = cos(rnd);\
					float sintheta = sin(rnd);\
					vec4 rotationMatrix = vec4(costheta, -sintheta, sintheta, costheta);\
						\
					vec3 colorSum = vec3(0.0);\
					float weightSum = 0.0;\
						\
					for (int i = 0; i < NUM_SAMPLES; i++) {\
						vec2 ofs = poisson_disk_samples[i];\
						ofs = vec2(dot(ofs, rotationMatrix.xy), dot(ofs, rotationMatrix.zw) );\
						vec2 texcoord = vUv + blurDist * ofs / texSize.xy;\
						vec4 sample = texture2D(colorTexture, texcoord);\
						float cocWeight = abs(sample.a);\
						cocWeight *= cocWeight * cocWeight;\
						colorSum += sample.rgb * cocWeight;\
						weightSum += cocWeight;\
					}\
						\
					colorSum /= weightSum;\
						\
					return vec4(colorSum, 1.0);\
				}\
				\
				void main() {\n\
					gl_FragColor = CircularBlur();\n\
				}',
    });
  },

  getDofBlurSeperableMaterial: function() {
    return new THREE.ShaderMaterial({
      uniforms: {
        cocTexture: { value: null },
        colorTexture: { value: null },
        texSize: { value: new THREE.Vector2(0.5, 0.5) },
        direction: { value: new THREE.Vector2(0.5, 0.5) },
      },

      vertexShader:
        'varying vec2 vUv;\n\
				void main() {\n\
					vUv = uv;\n\
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\
				}',

      fragmentShader:
        '#include <common>\n\
				varying vec2 vUv;\n\
				uniform sampler2D cocTexture;\n\
				uniform sampler2D colorTexture;\n\
				uniform vec2 texSize;\
				uniform vec2 direction;\
				const float MAXIMUM_BLUR_SIZE = 8.0;\
				\
				const float SIGMA = 5.0;\
				const int NUM_SAMPLES = 4;\
				float normpdf(in float x, in float sigma)\
				{\
					return 0.39894*exp(-0.5*x*x/(sigma*sigma))/sigma;\
				}\
				\
				vec4 weightedBlur() { \
					float cocIn = texture2D(cocTexture, vUv).a;\
					float kernelRadius = MAXIMUM_BLUR_SIZE * cocIn;\
					vec2 invSize = 1.0 / texSize;\
					cocIn *= cocIn * cocIn;\
					float centreSpaceWeight = normpdf(0.0, SIGMA) * abs(cocIn);\
					float weightSum = centreSpaceWeight;\
					vec4 centreSample = texture2D(colorTexture, vUv);\
					vec4 diffuseSum = centreSample * weightSum;\
					vec2 delta = invSize * kernelRadius/float(NUM_SAMPLES);\
					for( int i = 1; i <= NUM_SAMPLES; i ++ ) {\
							float spaceWeight = normpdf(float(i), SIGMA);\
							vec2 texcoord = direction * delta * float(i);\
							vec4 rightSample = texture2D( colorTexture, vUv + texcoord);\
							vec4 leftSample = texture2D( colorTexture, vUv - texcoord);\
							float leftCocWeight = abs(texture2D( cocTexture, vUv - texcoord).a);\
							float rightCocWeight = abs(texture2D( cocTexture, vUv + texcoord).a);\
							leftCocWeight *= leftCocWeight * leftCocWeight;\
							rightCocWeight *= rightCocWeight * rightCocWeight;\
							diffuseSum += ( (leftSample * leftCocWeight) + (rightSample * rightCocWeight) ) * spaceWeight;\
							weightSum += (spaceWeight * (leftCocWeight + rightCocWeight));\
					}\
				  return diffuseSum/weightSum;\
				}\
				\
				void main() {\n\
					gl_FragColor = weightedBlur();\n\
				}',
    });
  },

  getDofCombineMaterial: function() {
    return new THREE.ShaderMaterial({
      uniforms: {
        colorTexture: { value: null },
        blurTexture: { value: null },
        cocTexture: { value: null },
        depthTexture: { value: null },
        NearFarBlurScale: { value: new THREE.Vector2(0.5, 0.5) },
        texSize: { value: new THREE.Vector2(0.5, 0.5) },
        cameraNearFar: { value: new THREE.Vector2(0.1, 100) },
        focalDistance: { value: 20.0 },
      },

      vertexShader:
        'varying vec2 vUv;\n\
				void main() {\n\
					vUv = uv;\n\
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\
				}',

      fragmentShader:
        '#include <common>\n\
				#include <packing>\n\
				varying vec2 vUv;\n\
				uniform sampler2D colorTexture;\n\
				uniform sampler2D blurTexture;\n\
				uniform sampler2D cocTexture;\n\
				uniform sampler2D depthTexture;\n\
				uniform vec2 texSize;\
				uniform vec2 NearFarBlurScale;\
				uniform vec2 cameraNearFar;\
				uniform float focalDistance;\
				\
				float computeCoc() {\
					vec4 packedDepth = texture2D(depthTexture, vUv);\
					if(packedDepth.x == 1.0) return max(NearFarBlurScale.x, NearFarBlurScale.y);\
						float depth = unpackRGBAToDepth(packedDepth);\
						depth = -perspectiveDepthToViewZ(depth, cameraNearFar.x, cameraNearFar.y);\
						float coc = (depth - focalDistance)/depth;\
					return (coc > 0.0 ? coc * NearFarBlurScale.y : coc * NearFarBlurScale.x);\
				}\
				\
				void main() {\n\
					vec4 blur = texture2D(blurTexture, vUv);\
					blur += texture2D(blurTexture, vUv + vec2(1.5, 0.5) / texSize);\
					blur += texture2D(blurTexture, vUv + vec2(-0.5, 1.5) / texSize);\
					blur += texture2D(blurTexture, vUv + vec2(-1.5, -0.5) / texSize);\
					blur += texture2D(blurTexture, vUv + vec2(0.5, -1.5) / texSize);\
					blur /= 5.0;\
					float coc = abs(min(texture2D(cocTexture, vUv).a, computeCoc()));\
					coc = clamp(coc * coc * 8.0, 0.0, 1.0);\
					vec4 color = mix(texture2D(colorTexture, vUv), blur, vec4(coc));\
					gl_FragColor = color;\n\
				}',
    });
  },
});

// File:examples/js/postprocessing/UnrealBloomPass.js

/**
 * @author spidersharma / http://eduperiment.com/
 Inspired from Unreal Engine::
 https://docs.unrealengine.com/latest/INT/Engine/Rendering/PostProcessEffects/Bloom/
 */

THREE.UnrealBloomPass = function(resolution, strength, radius, threshold) {
  THREE.Pass.call(this);

  this.strength = strength !== undefined ? strength : 1;
  this.radius = radius;
  this.threshold = threshold;
  this.resolution =
    resolution !== undefined
      ? new THREE.Vector2(resolution.x, resolution.y)
      : new THREE.Vector2(256, 256);

  // render targets
  var pars = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  };
  this.renderTargetsHorizontal = [];
  this.renderTargetsVertical = [];
  this.nMips = 5;
  var resx = Math.round(this.resolution.x / 2);
  var resy = Math.round(this.resolution.y / 2);

  this.renderTargetBright = new THREE.WebGLRenderTarget(resx, resy, pars);
  this.renderTargetBright.texture.name = 'UnrealBloomPass.bright';
  this.renderTargetBright.texture.generateMipmaps = false;

  for (var i = 0; i < this.nMips; i++) {
    var renderTarget = new THREE.WebGLRenderTarget(resx, resy, pars);

    renderTarget.texture.name = 'UnrealBloomPass.h' + i;
    renderTarget.texture.generateMipmaps = false;

    this.renderTargetsHorizontal.push(renderTarget);

    var renderTarget = new THREE.WebGLRenderTarget(resx, resy, pars);

    renderTarget.texture.name = 'UnrealBloomPass.v' + i;
    renderTarget.texture.generateMipmaps = false;

    this.renderTargetsVertical.push(renderTarget);

    resx = Math.round(resx / 2);

    resy = Math.round(resy / 2);
  }

  // luminosity high pass material

  if (THREE.LuminosityHighPassShader === undefined)
    console.error(
      'THREE.UnrealBloomPass relies on THREE.LuminosityHighPassShader'
    );

  var highPassShader = THREE.LuminosityHighPassShader;
  this.highPassUniforms = THREE.UniformsUtils.clone(highPassShader.uniforms);

  this.highPassUniforms['luminosityThreshold'].value = threshold;
  this.highPassUniforms['smoothWidth'].value = 0.05;

  this.materialHighPassFilter = new THREE.ShaderMaterial({
    uniforms: this.highPassUniforms,
    vertexShader: highPassShader.vertexShader,
    fragmentShader: highPassShader.fragmentShader,
    defines: {},
  });

  // Gaussian Blur Materials
  this.separableBlurMaterials = [];
  var kernelSizeArray = [3, 5, 7, 9, 11];
  var resx = Math.round(this.resolution.x / 2);
  var resy = Math.round(this.resolution.y / 2);

  for (var i = 0; i < this.nMips; i++) {
    this.separableBlurMaterials.push(
      this.getSeperableBlurMaterial(kernelSizeArray[i])
    );

    this.separableBlurMaterials[i].uniforms[
      'texSize'
    ].value = new THREE.Vector2(resx, resy);

    resx = Math.round(resx / 2);

    resy = Math.round(resy / 2);
  }

  // Composite material
  this.compositeMaterial = this.getCompositeMaterial(this.nMips);
  this.compositeMaterial.uniforms[
    'blurTexture1'
  ].value = this.renderTargetsVertical[0].texture;
  this.compositeMaterial.uniforms[
    'blurTexture2'
  ].value = this.renderTargetsVertical[1].texture;
  this.compositeMaterial.uniforms[
    'blurTexture3'
  ].value = this.renderTargetsVertical[2].texture;
  this.compositeMaterial.uniforms[
    'blurTexture4'
  ].value = this.renderTargetsVertical[3].texture;
  this.compositeMaterial.uniforms[
    'blurTexture5'
  ].value = this.renderTargetsVertical[4].texture;
  this.compositeMaterial.uniforms['bloomStrength'].value = strength;
  this.compositeMaterial.uniforms['bloomRadius'].value = 0.1;
  this.compositeMaterial.needsUpdate = true;

  var bloomFactors = [1.0, 0.8, 0.6, 0.4, 0.2];
  this.compositeMaterial.uniforms['bloomFactors'].value = bloomFactors;
  this.bloomTintColors = [
    new THREE.Vector3(1, 1, 1),
    new THREE.Vector3(1, 1, 1),
    new THREE.Vector3(1, 1, 1),
    new THREE.Vector3(1, 1, 1),
    new THREE.Vector3(1, 1, 1),
  ];
  this.compositeMaterial.uniforms[
    'bloomTintColors'
  ].value = this.bloomTintColors;

  // copy material
  if (THREE.CopyShader === undefined)
    console.error('THREE.BloomPass relies on THREE.CopyShader');

  var copyShader = THREE.CopyShader;

  this.copyUniforms = THREE.UniformsUtils.clone(copyShader.uniforms);
  this.copyUniforms['opacity'].value = 1.0;

  this.materialCopy = new THREE.ShaderMaterial({
    uniforms: this.copyUniforms,
    vertexShader: copyShader.vertexShader,
    fragmentShader: copyShader.fragmentShader,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    transparent: true,
  });

  this.enabled = true;
  this.needsSwap = false;

  this.oldClearColor = new THREE.Color();
  this.oldClearAlpha = 1;

  this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  this.scene = new THREE.Scene();

  this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null);
  this.quad.frustumCulled = false; // Avoid getting clipped
  this.scene.add(this.quad);
};

THREE.UnrealBloomPass.prototype = Object.assign(
  Object.create(THREE.Pass.prototype),
  {
    constructor: THREE.UnrealBloomPass,

    dispose: function() {
      for (var i = 0; i < this.renderTargetsHorizontal.length(); i++) {
        this.renderTargetsHorizontal[i].dispose();
      }
      for (var i = 0; i < this.renderTargetsVertical.length(); i++) {
        this.renderTargetsVertical[i].dispose();
      }
      this.renderTargetBright.dispose();
    },

    setSize: function(width, height) {
      var resx = Math.round(width / 2);
      var resy = Math.round(height / 2);

      this.renderTargetBright.setSize(resx, resy);

      for (var i = 0; i < this.nMips; i++) {
        this.renderTargetsHorizontal[i].setSize(resx, resy);
        this.renderTargetsVertical[i].setSize(resx, resy);

        this.separableBlurMaterials[i].uniforms[
          'texSize'
        ].value = new THREE.Vector2(resx, resy);

        resx = Math.round(resx / 2);
        resy = Math.round(resy / 2);
      }
    },

    render: function(renderer, writeBuffer, readBuffer, delta, maskActive) {
      this.oldClearColor.copy(renderer.getClearColor());
      this.oldClearAlpha = renderer.getClearAlpha();
      var oldAutoClear = renderer.autoClear;
      renderer.autoClear = false;

      renderer.setClearColor(new THREE.Color(0, 0, 0), 0);

      if (maskActive) renderer.context.disable(renderer.context.STENCIL_TEST);

      // 1. Extract Bright Areas
      this.highPassUniforms['tDiffuse'].value = readBuffer.texture;
      this.highPassUniforms['luminosityThreshold'].value = this.threshold;
      this.quad.material = this.materialHighPassFilter;
      renderer.render(this.scene, this.camera, this.renderTargetBright, true);

      // 2. Blur All the mips progressively
      var inputRenderTarget = this.renderTargetBright;

      for (var i = 0; i < this.nMips; i++) {
        this.quad.material = this.separableBlurMaterials[i];

        this.separableBlurMaterials[i].uniforms['colorTexture'].value =
          inputRenderTarget.texture;

        this.separableBlurMaterials[i].uniforms['direction'].value =
          THREE.UnrealBloomPass.BlurDirectionX;

        renderer.render(
          this.scene,
          this.camera,
          this.renderTargetsHorizontal[i],
          true
        );

        this.separableBlurMaterials[i].uniforms[
          'colorTexture'
        ].value = this.renderTargetsHorizontal[i].texture;

        this.separableBlurMaterials[i].uniforms['direction'].value =
          THREE.UnrealBloomPass.BlurDirectionY;

        renderer.render(
          this.scene,
          this.camera,
          this.renderTargetsVertical[i],
          true
        );

        inputRenderTarget = this.renderTargetsVertical[i];
      }

      // Composite All the mips
      this.quad.material = this.compositeMaterial;
      this.compositeMaterial.uniforms['bloomStrength'].value = this.strength;
      this.compositeMaterial.uniforms['bloomRadius'].value = this.radius;
      this.compositeMaterial.uniforms[
        'bloomTintColors'
      ].value = this.bloomTintColors;
      renderer.render(
        this.scene,
        this.camera,
        this.renderTargetsHorizontal[0],
        true
      );

      // Blend it additively over the input texture
      this.quad.material = this.materialCopy;
      this.copyUniforms[
        'tDiffuse'
      ].value = this.renderTargetsHorizontal[0].texture;

      if (maskActive) renderer.context.enable(renderer.context.STENCIL_TEST);

      renderer.render(this.scene, this.camera, readBuffer);

      renderer.setClearColor(this.oldClearColor, this.oldClearAlpha);
      renderer.autoClear = oldAutoClear;
    },

    getSeperableBlurMaterial: function(kernelRadius) {
      return new THREE.ShaderMaterial({
        defines: {
          KERNEL_RADIUS: kernelRadius,
          SIGMA: kernelRadius,
        },

        uniforms: {
          colorTexture: { value: null },
          texSize: { value: new THREE.Vector2(0.5, 0.5) },
          direction: { value: new THREE.Vector2(0.5, 0.5) },
        },

        vertexShader:
          'varying vec2 vUv;\n\
				void main() {\n\
					vUv = uv;\n\
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\
				}',

        fragmentShader:
          '#include <common>\
				varying vec2 vUv;\n\
				uniform sampler2D colorTexture;\n\
				uniform vec2 texSize;\
				uniform vec2 direction;\
				\
				float gaussianPdf(in float x, in float sigma) {\
					return 0.39894 * exp( -0.5 * x * x/( sigma * sigma))/sigma;\
				}\
				void main() {\n\
					vec2 invSize = 1.0 / texSize;\
					float fSigma = float(SIGMA);\
					float weightSum = gaussianPdf(0.0, fSigma);\
					vec4 diffuseSum = texture2D( colorTexture, vUv) * weightSum;\
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {\
						float x = float(i);\
						float w = gaussianPdf(x, fSigma);\
						vec2 uvOffset = direction * invSize * x;\
						vec4 sample1 = texture2D( colorTexture, vUv + uvOffset);\
						vec4 sample2 = texture2D( colorTexture, vUv - uvOffset);\
						diffuseSum += (sample1 + sample2) * w;\
						weightSum += 2.0 * w;\
					}\
					gl_FragColor = diffuseSum/weightSum;\n\
				}',
      });
    },

    getCompositeMaterial: function(nMips) {
      return new THREE.ShaderMaterial({
        defines: {
          NUM_MIPS: nMips,
        },

        uniforms: {
          blurTexture1: { value: null },
          blurTexture2: { value: null },
          blurTexture3: { value: null },
          blurTexture4: { value: null },
          blurTexture5: { value: null },
          dirtTexture: { value: null },
          bloomStrength: { value: 1.0 },
          bloomFactors: { value: null },
          bloomTintColors: { value: null },
          bloomRadius: { value: 0.0 },
        },

        vertexShader:
          'varying vec2 vUv;\n\
				void main() {\n\
					vUv = uv;\n\
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\
				}',

        fragmentShader:
          'varying vec2 vUv;\
				uniform sampler2D blurTexture1;\
				uniform sampler2D blurTexture2;\
				uniform sampler2D blurTexture3;\
				uniform sampler2D blurTexture4;\
				uniform sampler2D blurTexture5;\
				uniform sampler2D dirtTexture;\
				uniform float bloomStrength;\
				uniform float bloomRadius;\
				uniform float bloomFactors[NUM_MIPS];\
				uniform vec3 bloomTintColors[NUM_MIPS];\
				\
				float lerpBloomFactor(const in float factor) { \
					float mirrorFactor = 1.2 - factor;\
					return mix(factor, mirrorFactor, bloomRadius);\
				}\
				\
				void main() {\
					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) + \
					 							 lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) + \
												 lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) + \
												 lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) + \
												 lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );\
				}',
      });
    },
  }
);

THREE.UnrealBloomPass.BlurDirectionX = new THREE.Vector2(1.0, 0.0);
THREE.UnrealBloomPass.BlurDirectionY = new THREE.Vector2(0.0, 1.0);

// File:examples/js/postprocessing/SparklePass.js

THREE.SparklePass = function(
  camera,
  renderer,
  worldSizeOfSparkle,
  sparkleTexture
) {
  THREE.Pass.call(this);

  this.camera = camera;
  this.worldSizeOfSparkle = worldSizeOfSparkle;
  this.sparkleTexture = sparkleTexture;

  this.sparkleScene = new THREE.Scene();
  this.sparkles = [];

  this.gems = {}; // keep a list of all the sparkles for that gem

  this.needsSwap = true;

  // create the noise texture and noise shader
  this.noiseTexture = new THREE.WebGLRenderTarget(256, 256, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    name: 'Sparkle Noise Texture',
  });

  var noiseShader = new THREE.ShaderMaterial(THREE.NoiseShader);
  noiseShader.uniforms = THREE.UniformsUtils.clone(noiseShader.uniforms);
  noiseShader.blending = THREE.NoBlending;
  noiseShader.premultipliedAlpha = true;
  noiseShader.transparent = true;
  noiseShader.depthTest = false;
  noiseShader.depthWrite = false;
  noiseShader.needsUpdate = true;

  // render to the noise texture
  renderer.renderPass(noiseShader, this.noiseTexture, true);

  this.copyMaterial = new THREE.ShaderMaterial(THREE.CopyShader);
  this.copyMaterial.uniforms = THREE.UniformsUtils.clone(
    this.copyMaterial.uniforms
  );
  this.copyMaterial.uniforms['opacity'].value = 1.0;
  this.copyMaterial.blending = THREE.NoBlending;
  this.copyMaterial.premultipliedAlpha = true;
  this.copyMaterial.transparent = true;
  this.copyMaterial.depthTest = false;
  this.copyMaterial.depthWrite = false;
};

THREE.SparklePass.prototype = Object.assign(
  Object.create(THREE.Pass.prototype),
  {
    constructor: THREE.SparklePass,

    setSparkleTexture: function(sparkleTexture) {
      this.sparkleTexture = sparkleTexture;
    },

    setWorldSizeOfSparkles: function(worldSizeOfSparkle) {
      this.worldSizeOfSparkle = worldSizeOfSparkle;
    },

    updateScene: function(originalScene) {
      // TODO: update the "gems" list, needed for future editor
      // console.log(originalScene);
    },

    addGemstone: function(gemstoneGeometry, originalMesh, sparklesCount) {
      if (!this.sparkleTexture) {
        return; // cannot add sparkles if there's no sparkle texture set
      }
      if (this.gems[originalMesh.uuid]) {
        return; // do not reinsert any sparkles if that object exists already
      }

      var sparkles = [];

      var rootNode = new THREE.Object3D();
      var baseSparkle = new THREE.Sparkle(this.sparkleTexture);

      // undo parent scale to normalize scale.
      baseSparkle.mesh.scale.set(1.0, 1.0, 1.0).divide(originalMesh.scale);
      baseSparkle.setScale(this.worldSizeOfSparkle);
      if (this.noiseTexture) {
        baseSparkle.material.uniforms[
          'noiseTexture'
        ].value = this.noiseTexture.texture;
      }

      var tmpVector = new THREE.Vector3();

      if (gemstoneGeometry instanceof THREE.BufferGeometry) {
        var positions = gemstoneGeometry.attributes.position.array;
        var nbVertices = positions.length / 3 - 1;

        for (var i = 0; i < sparklesCount; ++i) {
          var baseIndex = Math.round(Math.random() * nbVertices) * 3;
          tmpVector.x = positions[baseIndex];
          tmpVector.y = positions[baseIndex + 1];
          tmpVector.z = positions[baseIndex + 2];

          // randomly select a base sparkle to clone
          var sparkle = baseSparkle.shallowCopy();
          sparkle.mesh.position.copy(tmpVector);
          sparkle.setIntensity(1.0);

          sparkles.push(sparkle);
          rootNode.add(sparkle.mesh);
          sparkle.mesh.updateMatrixWorld(true);
        }
      } else {
        var vertices = gemstoneGeometry.vertices;
        var nbVertices = vertices.length - 1;

        for (var i = 0; i < sparklesCount; ++i) {
          tmpVector.copy(vertices[Math.round(Math.random() * nbVertices)]);

          // randomly select a base sparkle to clone
          var sparkle = baseSparkle.shallowCopy();
          sparkle.mesh.position.copy(tmpVector);
          sparkle.setIntensity(1.0);

          sparkles.push(sparkle);
          rootNode.add(sparkle.mesh);
          sparkle.mesh.updateMatrixWorld(true);
        }
      }
      this.sparkleScene.add(rootNode);

      this.gems[originalMesh.uuid] = {
        transform: rootNode,
        originalMesh: originalMesh,
        sparkles: sparkles,
      };
      this.enabled = true; // have at least one sparkle, we can now use that pass
    },

    removeGemstone: function(originalMesh) {
      if (this.gems[originalMesh.uuid]) {
        this.sparkleScene.remove(this.gems[originalMesh.uuid].transform);
        this.gems[originalMesh.uuid] = null;
      }
    },

    setScreenTexture: function(screenTexture) {
      // update the base material shared by all sparkles from an object so they all
      // use the same screen texture
      for (var meshId in this.gems) {
        var sparkles = this.gems[meshId] && this.gems[meshId].sparkles;
        if (sparkles) {
          for (var i = 0; i < sparkles.length; ++i) {
            sparkles[i].material.uniforms[
              'screenTexture'
            ].value = screenTexture;
          }
        }
      }
    },

    alignSparklesWithCamera: function() {
      for (var meshId in this.gems) {
        var gem = this.gems[meshId];
        if (gem) {
          var sparkles = gem && gem.sparkles;
          gem.transform.visible = gem.originalMesh.visible;
          if (gem.transform.visible && sparkles) {
            var il = sparkles.length;
            for (var i = 0; i < il; ++i) {
              sparkles[i].alignWithCamera(this.camera, gem.originalMesh);
            }
          }
        }
      }
    },

    render: function(renderer, writeBuffer, readBuffer, delta, maskActive) {
      this.alignSparklesWithCamera();
      this.setScreenTexture(readBuffer.texture);

      this.copyMaterial.uniforms['tDiffuse'].value = readBuffer.texture;

      renderer.renderPass(
        this.copyMaterial,
        this.renderToScreen ? null : writeBuffer,
        true
      );

      var previousAutoClear = renderer.autoClear;
      renderer.autoClear = false;
      renderer.render(
        this.sparkleScene,
        this.camera,
        this.renderToScreen ? null : writeBuffer
      );
      renderer.autoClear = previousAutoClear;
    },
  }
);

// File:examples/js/GlossyMirror.js

/**
 * @author spidersharma03
 * @author bhouston / Ben Houston / ben@clara.io
 */

THREE.MirrorHelper = function(mirror) {
  this.scene = new THREE.Scene();
  this.cameraOrtho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
  this.scene.add(this.quad);
  this.mirror = mirror;
  this.numMipMaps = 4;

  this.mirrorTextureMipMaps = [];
  this.tempRenderTargets = [];
  var parameters = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    stencilBuffer: false,
  };
  var mirrorTexture = mirror.mirrorRenderTarget;

  var width = mirrorTexture.width / 2,
    height = mirrorTexture.height / 2;
  for (var i = 0; i < this.numMipMaps; i++) {
    var mirrorRenderTarget = new THREE.WebGLRenderTarget(
      width,
      height,
      parameters
    );
    mirrorRenderTarget.texture.generateMipmaps = false;
    this.mirrorTextureMipMaps.push(mirrorRenderTarget);

    var tempRenderTarget = new THREE.WebGLRenderTarget(
      width,
      height,
      parameters
    );
    tempRenderTarget.texture.generateMipmaps = false;
    this.tempRenderTargets.push(tempRenderTarget);

    width /= 2;
    height /= 2;
  }

  this.vBlurMaterial = new THREE.ShaderMaterial(THREE.BlurShader);
  this.vBlurMaterial.side = THREE.DoubleSide;
  this.vBlurMaterial.uniforms['size'].value.set(
    mirrorTexture.width / 2,
    mirrorTexture.height / 2
  );
  this.vBlurMaterial.blending = THREE.NoBlending;
  THREE.BlurShaderUtils.configure(
    this.vBlurMaterial,
    5,
    3.0,
    new THREE.Vector2(0, 1)
  );

  this.hBlurMaterial = this.vBlurMaterial.clone();
  this.hBlurMaterial.side = THREE.DoubleSide;
  this.hBlurMaterial.uniforms['size'].value.set(
    mirrorTexture.width / 2,
    mirrorTexture.height / 2
  );
  this.hBlurMaterial.blending = THREE.NoBlending;
  THREE.BlurShaderUtils.configure(
    this.hBlurMaterial,
    5,
    3.0,
    new THREE.Vector2(1, 0)
  );
};

THREE.MirrorHelper.prototype = {
  constructor: THREE.MirrorHelper,

  setSize: function(width, height) {
    for (var i = 0; i < this.numMipMaps; i++) {
      width /= 2;
      height /= 2;
      this.mirrorTextureMipMaps[i].setSize(width, height);
      this.tempRenderTargets[i].setSize(width, height);
    }
  },

  update: function(renderer) {
    var textureIn = this.mirror.mirrorRenderTarget;
    for (var i = 0; i < this.numMipMaps; i++) {
      var renderTarget = this.mirrorTextureMipMaps[i];
      var tempRenderTarget = this.tempRenderTargets[i];

      this.hBlurMaterial.uniforms['size'].value.set(
        textureIn.width,
        textureIn.height
      );
      this.hBlurMaterial.uniforms['tDiffuse'].value = textureIn.texture;
      this.quad.material = this.hBlurMaterial;
      renderer.render(this.scene, this.cameraOrtho, tempRenderTarget, true);

      this.vBlurMaterial.uniforms['size'].value.set(
        tempRenderTarget.width,
        tempRenderTarget.height
      );
      this.vBlurMaterial.uniforms['tDiffuse'].value = tempRenderTarget.texture;
      this.quad.material = this.vBlurMaterial;
      renderer.render(this.scene, this.cameraOrtho, renderTarget, true);

      textureIn = renderTarget;
    }
  },
};

THREE.GlossyMirror = function(options) {
  THREE.Object3D.call(this);

  this.name = 'mirror_' + this.id;

  options = options || {};

  this.matrixNeedsUpdate = true;

  var width = options.textureWidth !== undefined ? options.textureWidth : 512;
  var height =
    options.textureHeight !== undefined ? options.textureHeight : 512;

  this.size = new THREE.Vector3(width, height);

  this.localMirrorNormal =
    options.localMirrorNormal !== undefined
      ? options.localMirrorNormal
      : new THREE.Vector3(0, 0, 1);

  this.distanceFade = 0.1;
  this.metalness = 0.0;
  this.specularColor = new THREE.Color(0xffffff);
  this.roughness = 0.0;
  this.fresnelStrength = 1.0;

  this.mirrorPlane = new THREE.Plane();
  this.mirrorWorldPosition = new THREE.Vector3();
  this.cameraWorldPosition = new THREE.Vector3();
  this.rotationMatrix = new THREE.Matrix4();
  this.lookAtPosition = new THREE.Vector3(0, 0, -1);
  this.matrixNeedsUpdate = true;

  // For debug only, show the normal and plane of the mirror
  var debugMode = options.debugMode !== undefined ? options.debugMode : false;

  if (debugMode) {
    var arrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, 0),
      10,
      0xffff80
    );
    var planeGeometry = new THREE.Geometry();
    planeGeometry.vertices.push(new THREE.Vector3(-10, -10, 0));
    planeGeometry.vertices.push(new THREE.Vector3(10, -10, 0));
    planeGeometry.vertices.push(new THREE.Vector3(10, 10, 0));
    planeGeometry.vertices.push(new THREE.Vector3(-10, 10, 0));
    planeGeometry.vertices.push(planeGeometry.vertices[0]);
    var plane = new THREE.Line(
      planeGeometry,
      new THREE.LineBasicMaterial({ color: 0xffff80 })
    );

    this.add(arrow);
    this.add(plane);
  }

  this.reflectionTextureMatrix = new THREE.Matrix4();

  this.mirrorNormal = new THREE.Vector3();
  var parameters = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    stencilBuffer: false,
  };

  this.mirrorRenderTarget = new THREE.WebGLRenderTarget(
    width,
    height,
    parameters
  );
  this.mirrorRenderTarget.texture.name = 'GlossyMirror.mirror';

  this.material = new THREE.ShaderMaterial(THREE.GlossyMirrorShader);
  this.material.defines = Object.assign({}, this.material.defines);
  this.material.uniforms = THREE.UniformsUtils.clone(this.material.uniforms);
  this.material.uniforms.tReflection.value = this.mirrorRenderTarget.texture;
  this.material.uniforms.reflectionTextureMatrix.value = this.reflectionTextureMatrix;

  this.mirrorRenderTarget.texture.generateMipmaps = false;

  this.clipPlane = new THREE.Plane(this.localMirrorNormal, 0);
  this.originalClipPlane = this.clipPlane.clone();
  this.falseClipPlane = this.clipPlane.clone();
  this.falseClipPlane.constant = 10000;

  this.depthMaterial = new THREE.MeshDepthMaterial();
  this.depthMaterial.depthPacking = THREE.RGBADepthPacking;
  this.depthMaterial.blending = THREE.NoBlending;
  this.depthMaterial.side = THREE.FrontSide;

  this.depthRenderTarget = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
  });
  this.depthRenderTarget.texture.generateMipmaps = false;
  this.depthRenderTarget.texture.name = 'GlossyMirror.depth';

  this.material.uniforms.tReflectionDepth.value = this.depthRenderTarget.texture;

  this.material.uniforms['screenSize'].value = new THREE.Vector2(width, height);

  this.mirrorHelper = new THREE.MirrorHelper(this);

  this.material.uniforms.tReflection.value = this.mirrorRenderTarget.texture;
  this.material.uniforms.tReflection1.value = this.mirrorHelper.mirrorTextureMipMaps[0].texture;
  this.material.uniforms.tReflection2.value = this.mirrorHelper.mirrorTextureMipMaps[1].texture;
  this.material.uniforms.tReflection3.value = this.mirrorHelper.mirrorTextureMipMaps[2].texture;
  this.material.uniforms.tReflection4.value = this.mirrorHelper.mirrorTextureMipMaps[3].texture;

  this.setSize(width, height);
};

THREE.GlossyMirror.prototype = Object.assign(
  Object.create(THREE.Object3D.prototype),
  {
    constructor: THREE.GlossyMirror,

    setSize: function(width, height) {
      if (this.size.x !== width || this.size.y !== height) {
        this.mirrorRenderTarget.setSize(width, height);
        this.depthRenderTarget.setSize(width, height);
        this.mirrorHelper.setSize(width, height);
        this.material.uniforms['screenSize'].value = new THREE.Vector2(
          width,
          height
        );

        this.size.set(width, height);
        this.matrixNeedsUpdate = true;
      }

      this.matrixNeedsUpdate = true;
    },

    updateReflectionTextureMatrix: function(camera) {
      this.updateMatrixWorld();
      camera.updateMatrixWorld();

      this.mirrorWorldPosition.setFromMatrixPosition(this.matrixWorld);
      this.cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);

      this.rotationMatrix.extractRotation(this.matrixWorld);

      this.mirrorNormal.copy(this.localMirrorNormal);
      this.mirrorNormal.applyMatrix4(this.rotationMatrix);

      var view = this.mirrorWorldPosition.clone().sub(this.cameraWorldPosition);
      view.reflect(this.mirrorNormal).negate();
      view.add(this.mirrorWorldPosition);

      this.rotationMatrix.extractRotation(camera.matrixWorld);

      this.lookAtPosition.set(0, 0, -1);
      this.lookAtPosition.applyMatrix4(this.rotationMatrix);
      this.lookAtPosition.add(this.cameraWorldPosition);

      var target = this.mirrorWorldPosition.clone().sub(this.lookAtPosition);
      target.reflect(this.mirrorNormal).negate();
      target.add(this.mirrorWorldPosition);

      this.up.set(0, -1, 0);
      this.up.applyMatrix4(this.rotationMatrix);
      this.up.reflect(this.mirrorNormal).negate();

      this.mirrorCamera.position.copy(view);
      this.mirrorCamera.up = this.up;
      this.mirrorCamera.lookAt(target);
      this.mirrorCamera.fov = camera.fov;
      this.mirrorCamera.near = camera.near;
      this.mirrorCamera.far = camera.far;
      this.mirrorCamera.aspect = camera.aspect;

      this.mirrorCamera.updateProjectionMatrix();
      this.mirrorCamera.updateMatrixWorld();
      this.mirrorCamera.matrixWorldInverse.getInverse(
        this.mirrorCamera.matrixWorld
      );

      // Update the texture matrix
      this.reflectionTextureMatrix.set(
        0.5,
        0.0,
        0.0,
        0.5,
        0.0,
        0.5,
        0.0,
        0.5,
        0.0,
        0.0,
        0.5,
        0.5,
        0.0,
        0.0,
        0.0,
        1.0
      );
      this.reflectionTextureMatrix.multiply(this.mirrorCamera.projectionMatrix);
      this.reflectionTextureMatrix.multiply(
        this.mirrorCamera.matrixWorldInverse
      );

      this.mirrorPlane.setFromNormalAndCoplanarPoint(
        this.mirrorNormal,
        this.mirrorWorldPosition
      );
      this.mirrorPlane.applyMatrix4(this.mirrorCamera.matrixWorldInverse);

      this.material.uniforms['mirrorCameraProjectionMatrix'].value.copy(
        this.mirrorCamera.projectionMatrix
      );
      this.material.uniforms[
        'mirrorCameraInverseProjectionMatrix'
      ].value.getInverse(this.mirrorCamera.projectionMatrix);

      this.material.uniforms['mirrorCameraWorldMatrix'].value.copy(
        camera.matrixWorld
      );
      this.material.uniforms['mirrorCameraNear'].value = this.mirrorCamera.near;
      this.material.uniforms['mirrorCameraFar'].value = this.mirrorCamera.far;

      this.material.uniforms['mirrorNormal'].value = this.mirrorNormal;
      this.material.uniforms[
        'mirrorWorldPosition'
      ].value = this.mirrorWorldPosition;
      this.material.transparent = true;
    },

    render: function(renderer, scene, camera, width, height) {
      if (!camera instanceof THREE.PerspectiveCamera)
        console.error(
          'THREE.GlossyMirror: camera is not a Perspective Camera!'
        );

      this.setSize(width, height);

      if (!this.mirrorCamera) {
        this.mirrorCamera = camera.clone();
        this.mirrorCamera.matrixAutoUpdate = true;
      }

      if (this.matrixNeedsUpdate) this.updateReflectionTextureMatrix(camera);

      this.matrixNeedsUpdate = true;

      // Render the mirrored view of the current scene into the target texture

      if (this.clipPlane !== undefined) {
        this.clipPlane.copy(this.originalClipPlane);

        this.clipPlane.applyMatrix4(this.matrixWorld);
        this.clippingPlanes = [this.clipPlane];
      }

      renderer.clippingPlanes = this.clippingPlanes;

      if (scene !== undefined && scene instanceof THREE.Scene) {
        // We can't render ourself to ourself
        var visible = this.material.visible;
        this.material.visible = false;

        renderer.render(
          scene,
          this.mirrorCamera,
          this.mirrorRenderTarget,
          true
        );

        this.material.visible = visible;
      }
      scene.overrideMaterial = this.depthMaterial;

      var visible = this.material.visible;

      var oldClearColor = renderer.getClearColor(),
        oldClearAlpha = renderer.getClearAlpha();

      renderer.setClearColor(0xffffff, 1);
      this.material.visible = false;

      renderer.render(scene, this.mirrorCamera, this.depthRenderTarget, true);

      scene.overrideMaterial = null;
      renderer.setClearColor(oldClearColor, oldClearAlpha);

      this.material.visible = visible;
      this.material.uniforms.distanceFade.value = this.distanceFade;
      this.material.uniforms.metalness.value = this.metalness;
      this.material.uniforms.fresnelStrength.value = this.fresnelStrength;
      this.material.uniforms.specularColor.value.copy(this.specularColor);
      this.material.uniforms.roughness.value = this.roughness;

      if (this.clipPlane !== undefined) {
        this.clipPlane.copy(this.falseClipPlane);
      }
      if (this.mirrorHelper !== undefined) {
        this.mirrorHelper.update(renderer);
      }
    },
  }
);

// File:examples/js/controls/OrbitControls.js

/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */

// This set of controls performs orbiting, dollying (zooming), and panning.
// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
//
//    Orbit - left mouse / touch: one finger move
//    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
//    Pan - right mouse, or arrow keys / touch: three finger swipe

THREE.OrbitControls = function(object, domElement) {
  this.object = object;

  this.domElement = domElement !== undefined ? domElement : document;

  // Set to false to disable this control
  this.enabled = true;

  // "target" sets the location of focus, where the object orbits around
  this.target = new THREE.Vector3();

  // How far you can dolly in and out ( PerspectiveCamera only )
  this.minDistance = 0;
  this.maxDistance = Infinity;

  // How far you can zoom in and out ( OrthographicCamera only )
  this.minZoom = 0;
  this.maxZoom = Infinity;

  // How far you can orbit vertically, upper and lower limits.
  // Range is 0 to Math.PI radians.
  this.minPolarAngle = 0; // radians
  this.maxPolarAngle = Math.PI; // radians

  // How far you can orbit horizontally, upper and lower limits.
  // If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
  this.minAzimuthAngle = -Infinity; // radians
  this.maxAzimuthAngle = Infinity; // radians

  // Set to true to enable damping (inertia)
  // If damping is enabled, you must call controls.update() in your animation loop
  this.enableDamping = false;
  this.dampingFactor = 0.25;

  // This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
  // Set to false to disable zooming
  this.enableZoom = true;
  this.zoomSpeed = 1.0;

  // Set to false to disable rotating
  this.enableRotate = true;
  this.rotateSpeed = 1.0;

  // Set to false to disable panning
  this.enablePan = true;
  this.keyPanSpeed = 7.0; // pixels moved per arrow key push

  // Set to true to automatically rotate around the target
  // If auto-rotate is enabled, you must call controls.update() in your animation loop
  this.autoRotate = false;
  this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

  // Set to false to disable use of the keys
  this.enableKeys = true;

  // The four arrow keys
  this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

  // Mouse buttons
  this.mouseButtons = {
    ORBIT: THREE.MOUSE.LEFT,
    ZOOM: THREE.MOUSE.MIDDLE,
    PAN: THREE.MOUSE.RIGHT,
  };

  // for reset
  this.target0 = this.target.clone();
  this.position0 = this.object.position.clone();
  this.zoom0 = this.object.zoom;

  //
  // public methods
  //

  this.getPolarAngle = function() {
    return spherical.phi;
  };

  this.getAzimuthalAngle = function() {
    return spherical.theta;
  };

  this.reset = function() {
    scope.target.copy(scope.target0);
    scope.object.position.copy(scope.position0);
    scope.object.zoom = scope.zoom0;

    scope.object.updateProjectionMatrix();
    scope.dispatchEvent(changeEvent);

    scope.update();

    state = STATE.NONE;
  };

  // this method is exposed, but perhaps it would be better if we can make it private...
  this.update = (function() {
    var offset = new THREE.Vector3();

    // so camera.up is the orbit axis
    var quat = new THREE.Quaternion().setFromUnitVectors(
      object.up,
      new THREE.Vector3(0, 1, 0)
    );
    var quatInverse = quat.clone().inverse();

    var lastPosition = new THREE.Vector3();
    var lastQuaternion = new THREE.Quaternion();

    return function update() {
      var position = scope.object.position;

      offset.copy(position).sub(scope.target);

      // rotate offset to "y-axis-is-up" space
      offset.applyQuaternion(quat);

      // angle from z-axis around y-axis
      spherical.setFromVector3(offset);

      if (scope.autoRotate && state === STATE.NONE) {
        rotateLeft(getAutoRotationAngle());
      }

      spherical.theta += sphericalDelta.theta;
      spherical.phi += sphericalDelta.phi;

      // restrict theta to be between desired limits
      spherical.theta = Math.max(
        scope.minAzimuthAngle,
        Math.min(scope.maxAzimuthAngle, spherical.theta)
      );

      // restrict phi to be between desired limits
      spherical.phi = Math.max(
        scope.minPolarAngle,
        Math.min(scope.maxPolarAngle, spherical.phi)
      );

      spherical.makeSafe();

      spherical.radius *= scale;

      // restrict radius to be between desired limits
      spherical.radius = Math.max(
        scope.minDistance,
        Math.min(scope.maxDistance, spherical.radius)
      );

      // move target to panned location
      scope.target.add(panOffset);

      offset.setFromSpherical(spherical);

      // rotate offset back to "camera-up-vector-is-up" space
      offset.applyQuaternion(quatInverse);

      position.copy(scope.target).add(offset);

      scope.object.lookAt(scope.target);

      if (scope.enableDamping === true) {
        sphericalDelta.theta *= 1 - scope.dampingFactor;
        sphericalDelta.phi *= 1 - scope.dampingFactor;
      } else {
        sphericalDelta.set(0, 0, 0);
      }

      scale = 1;
      panOffset.set(0, 0, 0);

      // update condition is:
      // min(camera displacement, camera rotation in radians)^2 > EPS
      // using small-angle approximation cos(x/2) = 1 - x^2 / 8

      if (
        zoomChanged ||
        lastPosition.distanceToSquared(scope.object.position) > EPS ||
        8 * (1 - lastQuaternion.dot(scope.object.quaternion)) > EPS
      ) {
        scope.dispatchEvent(changeEvent);

        lastPosition.copy(scope.object.position);
        lastQuaternion.copy(scope.object.quaternion);
        zoomChanged = false;

        return true;
      }

      return false;
    };
  })();

  this.dispose = function() {
    scope.domElement.removeEventListener('contextmenu', onContextMenu, false);
    scope.domElement.removeEventListener('mousedown', onMouseDown, false);
    scope.domElement.removeEventListener('wheel', onMouseWheel, false);

    scope.domElement.removeEventListener('touchstart', onTouchStart, false);
    scope.domElement.removeEventListener('touchend', onTouchEnd, false);
    scope.domElement.removeEventListener('touchmove', onTouchMove, false);

    document.removeEventListener('mousemove', onMouseMove, false);
    document.removeEventListener('mouseup', onMouseUp, false);

    window.removeEventListener('keydown', onKeyDown, false);

    //scope.dispatchEvent( { type: 'dispose' } ); // should this be added here?
  };

  //
  // internals
  //

  var scope = this;

  var changeEvent = { type: 'change' };
  var startEvent = { type: 'start' };
  var endEvent = { type: 'end' };

  var STATE = {
    NONE: -1,
    ROTATE: 0,
    DOLLY: 1,
    PAN: 2,
    TOUCH_ROTATE: 3,
    TOUCH_DOLLY: 4,
    TOUCH_PAN: 5,
  };

  var state = STATE.NONE;

  var EPS = 0.000001;

  // current position in spherical coordinates
  var spherical = new THREE.Spherical();
  var sphericalDelta = new THREE.Spherical();

  var scale = 1;
  var panOffset = new THREE.Vector3();
  var zoomChanged = false;

  var rotateStart = new THREE.Vector2();
  var rotateEnd = new THREE.Vector2();
  var rotateDelta = new THREE.Vector2();

  var panStart = new THREE.Vector2();
  var panEnd = new THREE.Vector2();
  var panDelta = new THREE.Vector2();

  var dollyStart = new THREE.Vector2();
  var dollyEnd = new THREE.Vector2();
  var dollyDelta = new THREE.Vector2();

  function getAutoRotationAngle() {
    return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;
  }

  function getZoomScale() {
    return Math.pow(0.95, scope.zoomSpeed);
  }

  function rotateLeft(angle) {
    sphericalDelta.theta -= angle;
  }

  function rotateUp(angle) {
    sphericalDelta.phi -= angle;
  }

  var panLeft = (function() {
    var v = new THREE.Vector3();

    return function panLeft(distance, objectMatrix) {
      v.setFromMatrixColumn(objectMatrix, 0); // get X column of objectMatrix
      v.multiplyScalar(-distance);

      panOffset.add(v);
    };
  })();

  var panUp = (function() {
    var v = new THREE.Vector3();

    return function panUp(distance, objectMatrix) {
      v.setFromMatrixColumn(objectMatrix, 1); // get Y column of objectMatrix
      v.multiplyScalar(distance);

      panOffset.add(v);
    };
  })();

  // deltaX and deltaY are in pixels; right and down are positive
  var pan = (function() {
    var offset = new THREE.Vector3();

    return function pan(deltaX, deltaY) {
      var element =
        scope.domElement === document
          ? scope.domElement.body
          : scope.domElement;

      if (scope.object instanceof THREE.PerspectiveCamera) {
        // perspective
        var position = scope.object.position;
        offset.copy(position).sub(scope.target);
        var targetDistance = offset.length();

        // half of the fov is center to top of screen
        targetDistance *= Math.tan(scope.object.fov / 2 * Math.PI / 180.0);

        // we actually don't use screenWidth, since perspective camera is fixed to screen height
        panLeft(
          2 * deltaX * targetDistance / element.clientHeight,
          scope.object.matrix
        );
        panUp(
          2 * deltaY * targetDistance / element.clientHeight,
          scope.object.matrix
        );
      } else if (scope.object instanceof THREE.OrthographicCamera) {
        // orthographic
        panLeft(
          deltaX *
            (scope.object.right - scope.object.left) /
            scope.object.zoom /
            element.clientWidth,
          scope.object.matrix
        );
        panUp(
          deltaY *
            (scope.object.top - scope.object.bottom) /
            scope.object.zoom /
            element.clientHeight,
          scope.object.matrix
        );
      } else {
        // camera neither orthographic nor perspective
        console.warn(
          'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.'
        );
        scope.enablePan = false;
      }
    };
  })();

  function dollyIn(dollyScale) {
    if (scope.object instanceof THREE.PerspectiveCamera) {
      scale /= dollyScale;
    } else if (scope.object instanceof THREE.OrthographicCamera) {
      scope.object.zoom = Math.max(
        scope.minZoom,
        Math.min(scope.maxZoom, scope.object.zoom * dollyScale)
      );
      scope.object.updateProjectionMatrix();
      zoomChanged = true;
    } else {
      console.warn(
        'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.'
      );
      scope.enableZoom = false;
    }
  }

  function dollyOut(dollyScale) {
    if (scope.object instanceof THREE.PerspectiveCamera) {
      scale *= dollyScale;
    } else if (scope.object instanceof THREE.OrthographicCamera) {
      scope.object.zoom = Math.max(
        scope.minZoom,
        Math.min(scope.maxZoom, scope.object.zoom / dollyScale)
      );
      scope.object.updateProjectionMatrix();
      zoomChanged = true;
    } else {
      console.warn(
        'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.'
      );
      scope.enableZoom = false;
    }
  }

  //
  // event callbacks - update the object state
  //

  function handleMouseDownRotate(event) {
    //console.log( 'handleMouseDownRotate' );

    rotateStart.set(event.clientX, event.clientY);
  }

  function handleMouseDownDolly(event) {
    //console.log( 'handleMouseDownDolly' );

    dollyStart.set(event.clientX, event.clientY);
  }

  function handleMouseDownPan(event) {
    //console.log( 'handleMouseDownPan' );

    panStart.set(event.clientX, event.clientY);
  }

  function handleMouseMoveRotate(event) {
    //console.log( 'handleMouseMoveRotate' );

    rotateEnd.set(event.clientX, event.clientY);
    rotateDelta.subVectors(rotateEnd, rotateStart);

    var element =
      scope.domElement === document ? scope.domElement.body : scope.domElement;

    // rotating across whole screen goes 360 degrees around
    rotateLeft(
      2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed
    );

    // rotating up and down along whole screen attempts to go 360, but limited to 180
    rotateUp(
      2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed
    );

    rotateStart.copy(rotateEnd);

    scope.update();
  }

  function handleMouseMoveDolly(event) {
    //console.log( 'handleMouseMoveDolly' );

    dollyEnd.set(event.clientX, event.clientY);

    dollyDelta.subVectors(dollyEnd, dollyStart);

    if (dollyDelta.y > 0) {
      dollyIn(getZoomScale());
    } else if (dollyDelta.y < 0) {
      dollyOut(getZoomScale());
    }

    dollyStart.copy(dollyEnd);

    scope.update();
  }

  function handleMouseMovePan(event) {
    //console.log( 'handleMouseMovePan' );

    panEnd.set(event.clientX, event.clientY);

    panDelta.subVectors(panEnd, panStart);

    pan(panDelta.x, panDelta.y);

    panStart.copy(panEnd);

    scope.update();
  }

  function handleMouseUp(event) {
    // console.log( 'handleMouseUp' );
  }

  function handleMouseWheel(event) {
    // console.log( 'handleMouseWheel' );

    if (event.deltaY < 0) {
      dollyOut(getZoomScale());
    } else if (event.deltaY > 0) {
      dollyIn(getZoomScale());
    }

    scope.update();
  }

  function handleKeyDown(event) {
    //console.log( 'handleKeyDown' );

    switch (event.keyCode) {
      case scope.keys.UP:
        pan(0, scope.keyPanSpeed);
        scope.update();
        break;

      case scope.keys.BOTTOM:
        pan(0, -scope.keyPanSpeed);
        scope.update();
        break;

      case scope.keys.LEFT:
        pan(scope.keyPanSpeed, 0);
        scope.update();
        break;

      case scope.keys.RIGHT:
        pan(-scope.keyPanSpeed, 0);
        scope.update();
        break;
    }
  }

  function handleTouchStartRotate(event) {
    //console.log( 'handleTouchStartRotate' );

    rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
  }

  function handleTouchStartDolly(event) {
    //console.log( 'handleTouchStartDolly' );

    var dx = event.touches[0].pageX - event.touches[1].pageX;
    var dy = event.touches[0].pageY - event.touches[1].pageY;

    var distance = Math.sqrt(dx * dx + dy * dy);

    dollyStart.set(0, distance);
  }

  function handleTouchStartPan(event) {
    //console.log( 'handleTouchStartPan' );

    panStart.set(event.touches[0].pageX, event.touches[0].pageY);
  }

  function handleTouchMoveRotate(event) {
    //console.log( 'handleTouchMoveRotate' );

    rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
    rotateDelta.subVectors(rotateEnd, rotateStart);

    var element =
      scope.domElement === document ? scope.domElement.body : scope.domElement;

    // rotating across whole screen goes 360 degrees around
    rotateLeft(
      2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed
    );

    // rotating up and down along whole screen attempts to go 360, but limited to 180
    rotateUp(
      2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed
    );

    rotateStart.copy(rotateEnd);

    scope.update();
  }

  function handleTouchMoveDolly(event) {
    //console.log( 'handleTouchMoveDolly' );

    var dx = event.touches[0].pageX - event.touches[1].pageX;
    var dy = event.touches[0].pageY - event.touches[1].pageY;

    var distance = Math.sqrt(dx * dx + dy * dy);

    dollyEnd.set(0, distance);

    dollyDelta.subVectors(dollyEnd, dollyStart);

    if (dollyDelta.y > 0) {
      dollyOut(getZoomScale());
    } else if (dollyDelta.y < 0) {
      dollyIn(getZoomScale());
    }

    dollyStart.copy(dollyEnd);

    scope.update();
  }

  function handleTouchMovePan(event) {
    //console.log( 'handleTouchMovePan' );

    panEnd.set(event.touches[0].pageX, event.touches[0].pageY);

    panDelta.subVectors(panEnd, panStart);

    pan(panDelta.x, panDelta.y);

    panStart.copy(panEnd);

    scope.update();
  }

  function handleTouchEnd(event) {
    //console.log( 'handleTouchEnd' );
  }

  //
  // event handlers - FSM: listen for events and reset state
  //

  function onMouseDown(event) {
    if (scope.enabled === false) return;

    event.preventDefault();

    if (event.button === scope.mouseButtons.ORBIT) {
      if (scope.enableRotate === false) return;

      handleMouseDownRotate(event);

      state = STATE.ROTATE;
    } else if (event.button === scope.mouseButtons.ZOOM) {
      if (scope.enableZoom === false) return;

      handleMouseDownDolly(event);

      state = STATE.DOLLY;
    } else if (event.button === scope.mouseButtons.PAN) {
      if (scope.enablePan === false) return;

      handleMouseDownPan(event);

      state = STATE.PAN;
    }

    if (state !== STATE.NONE) {
      document.addEventListener('mousemove', onMouseMove, false);
      document.addEventListener('mouseup', onMouseUp, false);

      scope.dispatchEvent(startEvent);
    }
  }

  function onMouseMove(event) {
    if (scope.enabled === false) return;

    event.preventDefault();

    if (state === STATE.ROTATE) {
      if (scope.enableRotate === false) return;

      handleMouseMoveRotate(event);
    } else if (state === STATE.DOLLY) {
      if (scope.enableZoom === false) return;

      handleMouseMoveDolly(event);
    } else if (state === STATE.PAN) {
      if (scope.enablePan === false) return;

      handleMouseMovePan(event);
    }
  }

  function onMouseUp(event) {
    if (scope.enabled === false) return;

    handleMouseUp(event);

    document.removeEventListener('mousemove', onMouseMove, false);
    document.removeEventListener('mouseup', onMouseUp, false);

    scope.dispatchEvent(endEvent);

    state = STATE.NONE;
  }

  function onMouseWheel(event) {
    if (
      scope.enabled === false ||
      scope.enableZoom === false ||
      (state !== STATE.NONE && state !== STATE.ROTATE)
    )
      return;

    event.preventDefault();
    event.stopPropagation();

    handleMouseWheel(event);

    scope.dispatchEvent(startEvent); // not sure why these are here...
    scope.dispatchEvent(endEvent);
  }

  function onKeyDown(event) {
    if (
      scope.enabled === false ||
      scope.enableKeys === false ||
      scope.enablePan === false
    )
      return;

    handleKeyDown(event);
  }

  function onTouchStart(event) {
    if (scope.enabled === false) return;

    switch (event.touches.length) {
      case 1: // one-fingered touch: rotate
        if (scope.enableRotate === false) return;

        handleTouchStartRotate(event);

        state = STATE.TOUCH_ROTATE;

        break;

      case 2: // two-fingered touch: dolly
        if (scope.enableZoom === false) return;

        handleTouchStartDolly(event);

        state = STATE.TOUCH_DOLLY;

        break;

      case 3: // three-fingered touch: pan
        if (scope.enablePan === false) return;

        handleTouchStartPan(event);

        state = STATE.TOUCH_PAN;

        break;

      default:
        state = STATE.NONE;
    }

    if (state !== STATE.NONE) {
      scope.dispatchEvent(startEvent);
    }
  }

  function onTouchMove(event) {
    if (scope.enabled === false) return;

    event.preventDefault();
    event.stopPropagation();

    switch (event.touches.length) {
      case 1: // one-fingered touch: rotate
        if (scope.enableRotate === false) return;
        if (state !== STATE.TOUCH_ROTATE) return; // is this needed?...

        handleTouchMoveRotate(event);

        break;

      case 2: // two-fingered touch: dolly
        if (scope.enableZoom === false) return;
        if (state !== STATE.TOUCH_DOLLY) return; // is this needed?...

        handleTouchMoveDolly(event);

        break;

      case 3: // three-fingered touch: pan
        if (scope.enablePan === false) return;
        if (state !== STATE.TOUCH_PAN) return; // is this needed?...

        handleTouchMovePan(event);

        break;

      default:
        state = STATE.NONE;
    }
  }

  function onTouchEnd(event) {
    if (scope.enabled === false) return;

    handleTouchEnd(event);

    scope.dispatchEvent(endEvent);

    state = STATE.NONE;
  }

  function onContextMenu(event) {
    event.preventDefault();
  }

  //

  scope.domElement.addEventListener('contextmenu', onContextMenu, false);

  scope.domElement.addEventListener('mousedown', onMouseDown, false);
  scope.domElement.addEventListener('wheel', onMouseWheel, false);

  scope.domElement.addEventListener('touchstart', onTouchStart, false);
  scope.domElement.addEventListener('touchend', onTouchEnd, false);
  scope.domElement.addEventListener('touchmove', onTouchMove, false);

  window.addEventListener('keydown', onKeyDown, false);

  // force an update at start

  this.update();
};

THREE.OrbitControls.prototype = Object.create(THREE.EventDispatcher.prototype);
THREE.OrbitControls.prototype.constructor = THREE.OrbitControls;

Object.defineProperties(THREE.OrbitControls.prototype, {
  center: {
    get: function() {
      console.warn('THREE.OrbitControls: .center has been renamed to .target');
      return this.target;
    },
  },

  // backward compatibility

  noZoom: {
    get: function() {
      console.warn(
        'THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.'
      );
      return !this.enableZoom;
    },

    set: function(value) {
      console.warn(
        'THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.'
      );
      this.enableZoom = !value;
    },
  },

  noRotate: {
    get: function() {
      console.warn(
        'THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.'
      );
      return !this.enableRotate;
    },

    set: function(value) {
      console.warn(
        'THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.'
      );
      this.enableRotate = !value;
    },
  },

  noPan: {
    get: function() {
      console.warn(
        'THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.'
      );
      return !this.enablePan;
    },

    set: function(value) {
      console.warn(
        'THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.'
      );
      this.enablePan = !value;
    },
  },

  noKeys: {
    get: function() {
      console.warn(
        'THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.'
      );
      return !this.enableKeys;
    },

    set: function(value) {
      console.warn(
        'THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.'
      );
      this.enableKeys = !value;
    },
  },

  staticMoving: {
    get: function() {
      console.warn(
        'THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.'
      );
      return !this.enableDamping;
    },

    set: function(value) {
      console.warn(
        'THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.'
      );
      this.enableDamping = !value;
    },
  },

  dynamicDampingFactor: {
    get: function() {
      console.warn(
        'THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.'
      );
      return this.dampingFactor;
    },

    set: function(value) {
      console.warn(
        'THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.'
      );
      this.dampingFactor = value;
    },
  },
});

// File:examples/js/ColorToJsonOverride.js

//override the toJSON function to return serialization to its previous state
THREE.Color.prototype.toJSON = function() {
  return { r: this.r, g: this.g, b: this.b };
};

// File:examples/js/loaders/RGBELoader.js

/**
 * @author Nikos M. / https://github.com/foo123/
 */

// https://github.com/mrdoob/three.js/issues/5552
// http://en.wikipedia.org/wiki/RGBE_image_format

THREE.HDRLoader = THREE.RGBELoader = function(manager) {
  this.manager = manager !== undefined ? manager : THREE.DefaultLoadingManager;
};

// extend THREE.DataTextureLoader
THREE.RGBELoader.prototype = Object.create(THREE.DataTextureLoader.prototype);

// adapted from http://www.graphics.cornell.edu/~bjw/rgbe.html
THREE.RGBELoader.prototype._parser = function(buffer) {
  var /* return codes for rgbe routines */
    RGBE_RETURN_SUCCESS = 0,
    RGBE_RETURN_FAILURE = -1,
    /* default error routine.  change this to change error handling */
    rgbe_read_error = 1,
    rgbe_write_error = 2,
    rgbe_format_error = 3,
    rgbe_memory_error = 4,
    rgbe_error = function(rgbe_error_code, msg) {
      switch (rgbe_error_code) {
        case rgbe_read_error:
          console.error('THREE.RGBELoader Read Error: ' + (msg || ''));
          break;
        case rgbe_write_error:
          console.error('THREE.RGBELoader Write Error: ' + (msg || ''));
          break;
        case rgbe_format_error:
          console.error('THREE.RGBELoader Bad File Format: ' + (msg || ''));
          break;
        default:
        case rgbe_memory_error:
          console.error('THREE.RGBELoader: Error: ' + (msg || ''));
      }
      return RGBE_RETURN_FAILURE;
    },
    /* offsets to red, green, and blue components in a data (float) pixel */
    RGBE_DATA_RED = 0,
    RGBE_DATA_GREEN = 1,
    RGBE_DATA_BLUE = 2,
    /* number of floats per pixel, use 4 since stored in rgba image format */
    RGBE_DATA_SIZE = 4,
    /* flags indicating which fields in an rgbe_header_info are valid */
    RGBE_VALID_PROGRAMTYPE = 1,
    RGBE_VALID_FORMAT = 2,
    RGBE_VALID_DIMENSIONS = 4,
    NEWLINE = '\n',
    fgets = function(buffer, lineLimit, consume) {
      lineLimit = !lineLimit ? 1024 : lineLimit;
      var p = buffer.pos,
        i = -1,
        len = 0,
        s = '',
        chunkSize = 128,
        chunk = String.fromCharCode.apply(
          null,
          new Uint16Array(buffer.subarray(p, p + chunkSize))
        );
      while (
        0 > (i = chunk.indexOf(NEWLINE)) &&
        len < lineLimit &&
        p < buffer.byteLength
      ) {
        s += chunk;
        len += chunk.length;
        p += chunkSize;
        chunk += String.fromCharCode.apply(
          null,
          new Uint16Array(buffer.subarray(p, p + chunkSize))
        );
      }

      if (-1 < i) {
        /*for (i=l-1; i>=0; i--) {
					byteCode = m.charCodeAt(i);
					if (byteCode > 0x7f && byteCode <= 0x7ff) byteLen++;
					else if (byteCode > 0x7ff && byteCode <= 0xffff) byteLen += 2;
					if (byteCode >= 0xDC00 && byteCode <= 0xDFFF) i--; //trail surrogate
				}*/
        if (false !== consume) buffer.pos += len + i + 1;
        return s + chunk.slice(0, i);
      }
      return false;
    },
    /* minimal header reading.  modify if you want to parse more information */
    RGBE_ReadHeader = function(buffer) {
      var line,
        match,
        // regexes to parse header info fields
        magic_token_re = /^#\?(\S+)$/,
        gamma_re = /^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,
        exposure_re = /^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,
        format_re = /^\s*FORMAT=(\S+)\s*$/,
        dimensions_re = /^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,
        // RGBE format header struct
        header = {
          valid: 0 /* indicate which fields are valid */,

          string: '' /* the actual header string */,

          comments: '' /* comments found in header */,

          programtype:
            'RGBE' /* listed at beginning of file to identify it
													* after "#?".  defaults to "RGBE" */,

          format: '' /* RGBE format, default 32-bit_rle_rgbe */,

          gamma: 1.0 /* image has already been gamma corrected with
													* given gamma.  defaults to 1.0 (no correction) */,

          exposure: 1.0 /* a value of 1.0 in an image corresponds to
													* <exposure> watts/steradian/m^2.
													* defaults to 1.0 */,

          width: 0,
          height: 0 /* image dimensions, width/height */,
        };

      if (buffer.pos >= buffer.byteLength || !(line = fgets(buffer))) {
        return rgbe_error(rgbe_read_error, 'no header found');
      }
      /* if you want to require the magic token then uncomment the next line */
      if (!(match = line.match(magic_token_re))) {
        return rgbe_error(rgbe_format_error, 'bad initial token');
      }
      header.valid |= RGBE_VALID_PROGRAMTYPE;
      header.programtype = match[1];
      header.string += line + '\n';

      while (true) {
        line = fgets(buffer);
        if (false === line) break;
        header.string += line + '\n';

        if ('#' === line.charAt(0)) {
          header.comments += line + '\n';
          continue; // comment line
        }

        if ((match = line.match(gamma_re))) {
          header.gamma = parseFloat(match[1], 10);
        }
        if ((match = line.match(exposure_re))) {
          header.exposure = parseFloat(match[1], 10);
        }
        if ((match = line.match(format_re))) {
          header.valid |= RGBE_VALID_FORMAT;
          header.format = match[1]; //'32-bit_rle_rgbe';
        }
        if ((match = line.match(dimensions_re))) {
          header.valid |= RGBE_VALID_DIMENSIONS;
          header.height = parseInt(match[1], 10);
          header.width = parseInt(match[2], 10);
        }

        if (
          header.valid & RGBE_VALID_FORMAT &&
          header.valid & RGBE_VALID_DIMENSIONS
        )
          break;
      }

      if (!(header.valid & RGBE_VALID_FORMAT)) {
        return rgbe_error(rgbe_format_error, 'missing format specifier');
      }
      if (!(header.valid & RGBE_VALID_DIMENSIONS)) {
        return rgbe_error(rgbe_format_error, 'missing image size specifier');
      }

      return header;
    },
    RGBE_ReadPixels_RLE = function(buffer, w, h) {
      var data_rgba,
        offset,
        pos,
        count,
        byteValue,
        scanline_buffer,
        ptr,
        ptr_end,
        i,
        l,
        off,
        isEncodedRun,
        scanline_width = w,
        num_scanlines = h,
        rgbeStart;

      if (
        // run length encoding is not allowed so read flat
        scanline_width < 8 ||
        scanline_width > 0x7fff ||
        // this file is not run length encoded
        (2 !== buffer[0] || 2 !== buffer[1] || buffer[2] & 0x80)
      ) {
        // return the flat buffer
        return new Uint8Array(buffer);
      }

      if (scanline_width !== ((buffer[2] << 8) | buffer[3])) {
        return rgbe_error(rgbe_format_error, 'wrong scanline width');
      }

      data_rgba = new Uint8Array(4 * w * h);

      if (!data_rgba || !data_rgba.length) {
        return rgbe_error(rgbe_memory_error, 'unable to allocate buffer space');
      }

      offset = 0;
      pos = 0;
      ptr_end = 4 * scanline_width;
      rgbeStart = new Uint8Array(4);
      scanline_buffer = new Uint8Array(ptr_end);

      // read in each successive scanline
      while (num_scanlines > 0 && pos < buffer.byteLength) {
        if (pos + 4 > buffer.byteLength) {
          return rgbe_error(rgbe_read_error);
        }

        rgbeStart[0] = buffer[pos++];
        rgbeStart[1] = buffer[pos++];
        rgbeStart[2] = buffer[pos++];
        rgbeStart[3] = buffer[pos++];

        if (
          2 != rgbeStart[0] ||
          2 != rgbeStart[1] ||
          ((rgbeStart[2] << 8) | rgbeStart[3]) != scanline_width
        ) {
          return rgbe_error(rgbe_format_error, 'bad rgbe scanline format');
        }

        // read each of the four channels for the scanline into the buffer
        // first red, then green, then blue, then exponent
        ptr = 0;
        while (ptr < ptr_end && pos < buffer.byteLength) {
          count = buffer[pos++];
          isEncodedRun = count > 128;
          if (isEncodedRun) count -= 128;

          if (0 === count || ptr + count > ptr_end) {
            return rgbe_error(rgbe_format_error, 'bad scanline data');
          }

          if (isEncodedRun) {
            // a (encoded) run of the same value
            byteValue = buffer[pos++];
            for (i = 0; i < count; i++) {
              scanline_buffer[ptr++] = byteValue;
            }
            //ptr += count;
          } else {
            // a literal-run
            scanline_buffer.set(buffer.subarray(pos, pos + count), ptr);
            ptr += count;
            pos += count;
          }
        }

        // now convert data from buffer into rgba
        // first red, then green, then blue, then exponent (alpha)
        l = scanline_width; //scanline_buffer.byteLength;
        for (i = 0; i < l; i++) {
          off = 0;
          data_rgba[offset] = scanline_buffer[i + off];
          off += scanline_width; //1;
          data_rgba[offset + 1] = scanline_buffer[i + off];
          off += scanline_width; //1;
          data_rgba[offset + 2] = scanline_buffer[i + off];
          off += scanline_width; //1;
          data_rgba[offset + 3] = scanline_buffer[i + off];
          offset += 4;
        }

        num_scanlines--;
      }

      return data_rgba;
    };

  var byteArray = new Uint8Array(buffer),
    byteLength = byteArray.byteLength;
  byteArray.pos = 0;
  var rgbe_header_info = RGBE_ReadHeader(byteArray);

  if (RGBE_RETURN_FAILURE !== rgbe_header_info) {
    var w = rgbe_header_info.width,
      h = rgbe_header_info.height,
      image_rgba_data = RGBE_ReadPixels_RLE(
        byteArray.subarray(byteArray.pos),
        w,
        h
      );
    if (RGBE_RETURN_FAILURE !== image_rgba_data) {
      return {
        width: w,
        height: h,
        data: image_rgba_data,
        header: rgbe_header_info.string,
        gamma: rgbe_header_info.gamma,
        exposure: rgbe_header_info.exposure,
        format: THREE.RGBEFormat, // handled as THREE.RGBAFormat in shaders
        type: THREE.UnsignedByteType,
      };
    }
  }
  return null;
};

// File:examples/js/cameras/CombinedCamera.js

/**
 *	@author zz85 / http://twitter.com/blurspline / http://www.lab4games.net/zz85/blog
 *
 *		A general perpose camera, for setting FOV, Lens Focal Length,
 *		and switching between perspective and orthographic views easily.
 *		Use this only if you do not wish to manage
 *		both a Orthographic and Perspective Camera
 *
 */

THREE.CombinedCamera = function(width, height, fov, near, far) {
  THREE.Camera.call(this);
  // perspective
  this.fov = fov;
  this.far = far;
  this.near = near;
  //orthographic
  this.left = -width / 2;
  this.right = width / 2;
  this.top = height / 2;
  this.bottom = -height / 2;

  this.aspect = width / height;
  this.zoom = 1;
  this.focus = 10;
  this.view = null;
  this.hyperfocusOffset = 0;
  this.hyperfocusScale = 0.5;
  // We could also handle the projectionMatrix internally, but just wanted to test nested camera objects

  this.cameraO = new THREE.OrthographicCamera(
    this.left,
    this.right,
    this.top,
    this.bottom,
    this.near,
    this.far
  );
  this.cameraP = new THREE.PerspectiveCamera(
    this.fov,
    this.aspect,
    this.near,
    this.far
  );

  this.toPerspective();
};

THREE.CombinedCamera.prototype = Object.create(THREE.Camera.prototype);
THREE.CombinedCamera.prototype.constructor = THREE.CombinedCamera;

THREE.CombinedCamera.prototype.toPerspective = function() {
  // Switches to the Perspective Camera

  this.cameraP.near = this.near;
  this.cameraP.far = this.far;
  this.cameraP.aspect = this.aspect;
  this.cameraP.fov = this.fov;
  this.cameraP.zoom = this.zoom;
  this.cameraP.view = this.view;
  this.cameraP.focus = this.focus;

  this.cameraP.updateProjectionMatrix();

  this.projectionMatrix = this.cameraP.projectionMatrix;

  this.inPerspectiveMode = true;
  this.inOrthographicMode = false;
};

THREE.CombinedCamera.prototype.toOrthographic = function() {
  // Switches to the Orthographic camera estimating viewport from Perspective

  var fov = this.fov;
  var aspect = this.aspect;

  var halfHeight =
    Math.tan(fov * Math.PI / 180 / 2) *
    (this.hyperfocusOffset + this.hyperfocusScale * (this.near + this.far));
  var halfWidth = halfHeight * aspect;

  this.cameraO.near = this.near;
  this.cameraO.far = this.far;
  this.cameraO.left = -halfWidth;
  this.cameraO.right = halfWidth;
  this.cameraO.top = halfHeight;
  this.cameraO.bottom = -halfHeight;

  this.cameraO.zoom = this.zoom;
  this.cameraO.view = this.view;

  this.cameraO.updateProjectionMatrix();

  this.projectionMatrix = this.cameraO.projectionMatrix;

  this.inPerspectiveMode = false;
  this.inOrthographicMode = true;
};

THREE.CombinedCamera.prototype.setSize = function(width, height) {
  this.aspect = width / height;
  this.left = -width / 2;
  this.right = width / 2;
  this.top = height / 2;
  this.bottom = -height / 2;
};

THREE.CombinedCamera.prototype.setFov = function(fov) {
  this.fov = fov;

  if (this.inPerspectiveMode) {
    this.toPerspective();
  } else {
    this.toOrthographic();
  }
};

THREE.CombinedCamera.prototype.copy = function(source) {
  THREE.Camera.prototype.copy.call(this, source);

  this.fov = source.fov;
  this.far = source.far;
  this.near = source.near;

  this.left = source.left;
  this.right = source.right;
  this.top = source.top;
  this.bottom = source.bottom;

  this.zoom = source.zoom;
  this.view = source.view === null ? null : Object.assign({}, source.view);
  this.aspect = source.aspect;
  this.hyperfocusOffset = source.hyperfocusOffset;
  this.hyperfocusScale = source.hyperfocusScale;

  this.cameraO.copy(source.cameraO);
  this.cameraP.copy(source.cameraP);

  this.inOrthographicMode = source.inOrthographicMode;
  this.inPerspectiveMode = source.inPerspectiveMode;

  return this;
};

THREE.CombinedCamera.prototype.setViewOffset = function(
  fullWidth,
  fullHeight,
  x,
  y,
  width,
  height
) {
  this.view = {
    fullWidth: fullWidth,
    fullHeight: fullHeight,
    offsetX: x,
    offsetY: y,
    width: width,
    height: height,
  };

  if (this.inPerspectiveMode) {
    this.aspect = fullWidth / fullHeight;

    this.toPerspective();
  } else {
    this.toOrthographic();
  }
};

THREE.CombinedCamera.prototype.clearViewOffset = function() {
  this.view = null;
  this.updateProjectionMatrix();
};
// For maintaining similar API with PerspectiveCamera

THREE.CombinedCamera.prototype.updateProjectionMatrix = function() {
  if (this.inPerspectiveMode) {
    this.toPerspective();
  } else {
    this.toPerspective();
    this.toOrthographic();
  }
};

/*
* Uses Focal Length (in mm) to estimate and set FOV
* 35mm (full frame) camera is used if frame size is not specified;
* Formula based on http://www.bobatkins.com/photography/technical/field_of_view.html
*/
THREE.CombinedCamera.prototype.setLens = function(focalLength, filmGauge) {
  if (filmGauge === undefined) filmGauge = 35;

  var vExtentSlope =
    0.5 * filmGauge / (focalLength * Math.max(this.cameraP.aspect, 1));

  var fov = THREE.Math.RAD2DEG * 2 * Math.atan(vExtentSlope);

  this.setFov(fov);

  return fov;
};

THREE.CombinedCamera.prototype.setZoom = function(zoom) {
  this.zoom = zoom;

  if (this.inPerspectiveMode) {
    this.toPerspective();
  } else {
    this.toOrthographic();
  }
};

THREE.CombinedCamera.prototype.toFrontView = function() {
  this.rotation.x = 0;
  this.rotation.y = 0;
  this.rotation.z = 0;

  this.position.x = 0;
  this.position.y = 0;
  this.position.z = -15;
  // should we be modifing the matrix instead?
};

THREE.CombinedCamera.prototype.toBackView = function() {
  this.rotation.x = 0;
  this.rotation.y = Math.PI;
  this.rotation.z = 0;

  this.position.x = 0;
  this.position.y = 0;
  this.position.z = 15;
};

THREE.CombinedCamera.prototype.toLeftView = function() {
  this.rotation.x = 0;
  this.rotation.y = -Math.PI / 2;
  this.rotation.z = 0;

  this.position.x = -15;
  this.position.y = 0;
  this.position.z = 0;
};

THREE.CombinedCamera.prototype.toRightView = function() {
  this.rotation.x = 0;
  this.rotation.y = Math.PI / 2;
  this.rotation.z = 0;

  this.position.x = 15;
  this.position.y = 0;
  this.position.z = 0;
};

THREE.CombinedCamera.prototype.toTopView = function() {
  this.rotation.x = -Math.PI / 2;
  this.rotation.y = 0;
  this.rotation.z = 0;

  this.position.x = 0;
  this.position.y = 15;
  this.position.z = 0;
};

THREE.CombinedCamera.prototype.toBottomView = function() {
  this.rotation.x = Math.PI / 2;
  this.rotation.y = 0;
  this.rotation.z = 0;

  this.position.x = 0;
  this.position.y = -15;
  this.position.z = 0;
};

THREE.CombinedCamera.prototype.toPerspectiveView = function() {
  this.rotation.x = -Math.PI / 4;
  this.rotation.y = -Math.PI / 4;
  this.rotation.z = 0;

  this.position.x = 4;
  this.position.y = 4;
  this.position.z = 4;
};

// File:examples/js/effects/ParallaxBarrierEffect.js

/**
 * @author mrdoob / http://mrdoob.com/
 * @author marklundin / http://mark-lundin.com/
 * @author alteredq / http://alteredqualia.com/
 */

THREE.ParallaxBarrierEffect = function(renderer) {
  var _camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  var _scene = new THREE.Scene();

  var _stereo = new THREE.StereoCamera();

  var _params = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
  };

  var _renderTargetL = new THREE.WebGLRenderTarget(512, 512, _params);
  var _renderTargetR = new THREE.WebGLRenderTarget(512, 512, _params);

  var _material = new THREE.ShaderMaterial({
    uniforms: {
      mapLeft: { value: _renderTargetL.texture },
      mapRight: { value: _renderTargetR.texture },
      resolution: { value: new THREE.Vector2(512, 512) },
    },

    vertexShader: [
      'varying vec2 vUv;',

      'void main() {',

      ' vUv = vec2( uv.x, uv.y );',
      ' gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

      '}',
    ].join('\n'),

    fragmentShader: [
      'uniform sampler2D mapLeft;',
      'uniform sampler2D mapRight;',
      'uniform vec2 resolution;',
      'varying vec2 vUv;',

      'void main() {',

      ' vec2 uv = vUv;',

      ' if ( ( mod( gl_FragCoord.x + 1.0, 2.0 ) ) > 1.00 ) {',

      '   gl_FragColor = texture2D( mapLeft, uv );',

      ' } else {',

      '   gl_FragColor = texture2D( mapRight, uv - vec2( resolution.x, 0 ) );',

      ' }',

      '}',
    ].join('\n'),
  });

  var mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), _material);
  _scene.add(mesh);

  this.setSize = function(width, height) {
    renderer.setSize(width, height);

    var pixelRatio = renderer.getPixelRatio();

    _material.uniforms['resolution'].value.set(1.0 / width, 1.0 / height);

    _renderTargetL.setSize(width * pixelRatio / 2 + 1, height * pixelRatio);
    _renderTargetR.setSize(width * pixelRatio / 2 + 1, height * pixelRatio);
  };

  this.render = function(scene, camera) {
    scene.updateMatrixWorld();

    if (camera.parent === null) camera.updateMatrixWorld();

    _stereo.update(camera);

    renderer.render(scene, _stereo.cameraL, _renderTargetL, true);
    renderer.render(scene, _stereo.cameraR, _renderTargetR, true);
    renderer.render(_scene, _camera);
  };
};

// File:examples/js/effects/StereoEffect.js

/**
 * @author alteredq / http://alteredqualia.com/
 * @authod mrdoob / http://mrdoob.com/
 * @authod arodic / http://aleksandarrodic.com/
 * @authod fonserbc / http://fonserbc.github.io/
*/

THREE.StereoEffect = function(renderer) {
  var _stereo = new THREE.StereoCamera();
  _stereo.aspect = 0.5;

  this.setEyeSeparation = function(eyeSep) {
    _stereo.eyeSep = eyeSep;
  };

  this.setSize = function(width, height) {
    renderer.setSize(width, height);
  };

  this.updateStereo = function(camera) {
    _stereo.update(camera);
  };

  this.getCameraL = function() {
    return _stereo.cameraL;
  };

  this.getCameraR = function() {
    return _stereo.cameraR;
  };

  this.render = function(scene, camera) {
    scene.updateMatrixWorld();

    if (camera.parent === null) camera.updateMatrixWorld();

    _stereo.update(camera);

    var size = renderer.getSize();

    if (renderer.autoClear) renderer.clear();
    renderer.setScissorTest(true);

    renderer.setScissor(0, 0, size.width / 2, size.height);
    renderer.setViewport(0, 0, size.width / 2, size.height);
    renderer.render(scene, _stereo.cameraL);

    renderer.setScissor(size.width / 2, 0, size.width / 2, size.height);
    renderer.setViewport(size.width / 2, 0, size.width / 2, size.height);
    renderer.render(scene, _stereo.cameraR);

    renderer.setScissorTest(false);
  };
};

// File:examples/js/shaders/FXAAShader.js

/**
 * @author alteredq / http://alteredqualia.com/
 * @author davidedc / http://www.sketchpatch.net/
 *
 * NVIDIA FXAA by Timothy Lottes
 * http://timothylottes.blogspot.com/2011/06/fxaa3-source-released.html
 * - WebGL port by @supereggbert
 * http://www.glge.org/demos/fxaa/
 */

THREE.FXAAShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(1 / 1024, 1 / 512) },
  },

  vertexShader: [
    'void main() {',

    'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

    '}',
  ].join('\n'),

  fragmentShader: [
    'uniform sampler2D tDiffuse;',
    'uniform vec2 resolution;',

    '#define FXAA_REDUCE_MIN   (1.0/128.0)',
    '#define FXAA_REDUCE_MUL   (1.0/8.0)',
    '#define FXAA_SPAN_MAX     8.0',

    'void main() {',

    'vec3 rgbNW = texture2D( tDiffuse, ( gl_FragCoord.xy + vec2( -1.0, -1.0 ) ) * resolution ).xyz;',
    'vec3 rgbNE = texture2D( tDiffuse, ( gl_FragCoord.xy + vec2( 1.0, -1.0 ) ) * resolution ).xyz;',
    'vec3 rgbSW = texture2D( tDiffuse, ( gl_FragCoord.xy + vec2( -1.0, 1.0 ) ) * resolution ).xyz;',
    'vec3 rgbSE = texture2D( tDiffuse, ( gl_FragCoord.xy + vec2( 1.0, 1.0 ) ) * resolution ).xyz;',
    'vec4 rgbaM  = texture2D( tDiffuse,  gl_FragCoord.xy  * resolution );',
    'vec3 rgbM  = rgbaM.xyz;',
    'vec3 luma = vec3( 0.299, 0.587, 0.114 );',

    'float lumaNW = dot( rgbNW, luma );',
    'float lumaNE = dot( rgbNE, luma );',
    'float lumaSW = dot( rgbSW, luma );',
    'float lumaSE = dot( rgbSE, luma );',
    'float lumaM  = dot( rgbM,  luma );',
    'float lumaMin = min( lumaM, min( min( lumaNW, lumaNE ), min( lumaSW, lumaSE ) ) );',
    'float lumaMax = max( lumaM, max( max( lumaNW, lumaNE) , max( lumaSW, lumaSE ) ) );',

    'vec2 dir;',
    'dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));',
    'dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));',

    'float dirReduce = max( ( lumaNW + lumaNE + lumaSW + lumaSE ) * ( 0.25 * FXAA_REDUCE_MUL ), FXAA_REDUCE_MIN );',

    'float rcpDirMin = 1.0 / ( min( abs( dir.x ), abs( dir.y ) ) + dirReduce );',
    'dir = min( vec2( FXAA_SPAN_MAX,  FXAA_SPAN_MAX),',
    'max( vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),',
    'dir * rcpDirMin)) * resolution;',
    'vec4 rgbA = (1.0/2.0) * (',
    'texture2D(tDiffuse,  gl_FragCoord.xy  * resolution + dir * (1.0/3.0 - 0.5)) +',
    'texture2D(tDiffuse,  gl_FragCoord.xy  * resolution + dir * (2.0/3.0 - 0.5)));',
    'vec4 rgbB = rgbA * (1.0/2.0) + (1.0/4.0) * (',
    'texture2D(tDiffuse,  gl_FragCoord.xy  * resolution + dir * (0.0/3.0 - 0.5)) +',
    'texture2D(tDiffuse,  gl_FragCoord.xy  * resolution + dir * (3.0/3.0 - 0.5)));',
    'float lumaB = dot(rgbB, vec4(luma, 0.0));',

    'if ( ( lumaB < lumaMin ) || ( lumaB > lumaMax ) ) {',

    'gl_FragColor = rgbA;',

    '} else {',
    'gl_FragColor = rgbB;',

    '}',

    '}',
  ].join('\n'),
};

// File:examples/js/postprocessing/OutlinePass.js

/**
 * @author spidersharma / http://eduperiment.com/
 */

THREE.OutlinePass = function(resolution, scene, camera, selectedObjects) {
  this.renderScene = scene;
  this.camera = camera;
  this.selectedObjects = selectedObjects !== undefined ? selectedObjects : [];
  this.visibleEdgeColor = new THREE.Color(1, 1, 1);
  this.hiddenEdgeColor = new THREE.Color(0.1, 0.04, 0.02);
  this.edgeGlow = 0.0;
  this.usePatternTexture = false;
  this.edgeThickness = 1.0;
  this.edgeStrength = 3.0;
  this.downSampleRatio = 2;
  this.pulsePeriod = 0;

  THREE.Pass.call(this);

  this.resolution =
    resolution !== undefined
      ? new THREE.Vector2(resolution.x, resolution.y)
      : new THREE.Vector2(256, 256);

  var pars = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  };

  var resx = Math.round(this.resolution.x / this.downSampleRatio);
  var resy = Math.round(this.resolution.y / this.downSampleRatio);

  this.maskBufferMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  this.maskBufferMaterial.side = THREE.DoubleSide;
  this.renderTargetMaskBuffer = new THREE.WebGLRenderTarget(
    this.resolution.x,
    this.resolution.y,
    pars
  );
  this.renderTargetMaskBuffer.texture.name = 'OutlinePass.mask';
  this.renderTargetMaskBuffer.texture.generateMipmaps = false;

  this.depthMaterial = new THREE.MeshDepthMaterial();
  this.depthMaterial.side = THREE.DoubleSide;
  this.depthMaterial.depthPacking = THREE.RGBADepthPacking;
  this.depthMaterial.blending = THREE.NoBlending;

  this.prepareMaskMaterial = this.getPrepareMaskMaterial();
  this.prepareMaskMaterial.side = THREE.DoubleSide;

  this.renderTargetDepthBuffer = new THREE.WebGLRenderTarget(
    this.resolution.x,
    this.resolution.y,
    pars
  );
  this.renderTargetDepthBuffer.texture.name = 'OutlinePass.depth';
  this.renderTargetDepthBuffer.texture.generateMipmaps = false;

  this.renderTargetMaskDownSampleBuffer = new THREE.WebGLRenderTarget(
    resx,
    resy,
    pars
  );
  this.renderTargetMaskDownSampleBuffer.texture.name =
    'OutlinePass.depthDownSample';
  this.renderTargetMaskDownSampleBuffer.texture.generateMipmaps = false;

  this.renderTargetBlurBuffer1 = new THREE.WebGLRenderTarget(resx, resy, pars);
  this.renderTargetBlurBuffer1.texture.name = 'OutlinePass.blur1';
  this.renderTargetBlurBuffer1.texture.generateMipmaps = false;
  this.renderTargetBlurBuffer2 = new THREE.WebGLRenderTarget(
    Math.round(resx / 2),
    Math.round(resy / 2),
    pars
  );
  this.renderTargetBlurBuffer2.texture.name = 'OutlinePass.blur2';
  this.renderTargetBlurBuffer2.texture.generateMipmaps = false;

  this.edgeDetectionMaterial = this.getEdgeDetectionMaterial();
  this.renderTargetEdgeBuffer1 = new THREE.WebGLRenderTarget(resx, resy, pars);
  this.renderTargetEdgeBuffer1.texture.name = 'OutlinePass.edge1';
  this.renderTargetEdgeBuffer1.texture.generateMipmaps = false;
  this.renderTargetEdgeBuffer2 = new THREE.WebGLRenderTarget(
    Math.round(resx / 2),
    Math.round(resy / 2),
    pars
  );
  this.renderTargetEdgeBuffer2.texture.name = 'OutlinePass.edge2';
  this.renderTargetEdgeBuffer2.texture.generateMipmaps = false;

  var MAX_EDGE_THICKNESS = 4;
  var MAX_EDGE_GLOW = 4;

  this.separableBlurMaterial1 = this.getSeperableBlurMaterial(
    MAX_EDGE_THICKNESS
  );
  this.separableBlurMaterial1.uniforms['texSize'].value = new THREE.Vector2(
    resx,
    resy
  );
  this.separableBlurMaterial1.uniforms['kernelRadius'].value = 1;
  this.separableBlurMaterial2 = this.getSeperableBlurMaterial(MAX_EDGE_GLOW);
  this.separableBlurMaterial2.uniforms['texSize'].value = new THREE.Vector2(
    Math.round(resx / 2),
    Math.round(resy / 2)
  );
  this.separableBlurMaterial2.uniforms['kernelRadius'].value = MAX_EDGE_GLOW;

  // Overlay material
  this.overlayMaterial = this.getOverlayMaterial();

  // copy material
  if (THREE.CopyShader === undefined)
    console.error('THREE.OutlinePass relies on THREE.CopyShader');

  var copyShader = THREE.CopyShader;

  this.copyUniforms = THREE.UniformsUtils.clone(copyShader.uniforms);
  this.copyUniforms['opacity'].value = 1.0;

  this.materialCopy = new THREE.ShaderMaterial({
    uniforms: this.copyUniforms,
    vertexShader: copyShader.vertexShader,
    fragmentShader: copyShader.fragmentShader,
    blending: THREE.NoBlending,
    depthTest: false,
    depthWrite: false,
    transparent: true,
  });

  this.enabled = true;
  this.needsSwap = false;

  this.oldClearColor = new THREE.Color();
  this.oldClearAlpha = 1;

  this.orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  this.scene = new THREE.Scene();

  this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null);
  this.quad.frustumCulled = false; // Avoid getting clipped
  this.scene.add(this.quad);

  this.tempPulseColor1 = new THREE.Color();
  this.tempPulseColor2 = new THREE.Color();
  this.textureMatrix = new THREE.Matrix4();
};

THREE.OutlinePass.prototype = Object.assign(
  Object.create(THREE.Pass.prototype),
  {
    constructor: THREE.OutlinePass,

    dispose: function() {
      this.renderTargetMaskBuffer.dispose();
      this.renderTargetDepthBuffer.dispose();
      this.renderTargetMaskDownSampleBuffer.dispose();
      this.renderTargetBlurBuffer1.dispose();
      this.renderTargetBlurBuffer2.dispose();
      this.renderTargetEdgeBuffer1.dispose();
      this.renderTargetEdgeBuffer2.dispose();
    },

    setSize: function(width, height) {
      this.renderTargetMaskBuffer.setSize(width, height);

      var resx = Math.round(width / this.downSampleRatio);
      var resy = Math.round(height / this.downSampleRatio);
      this.renderTargetMaskDownSampleBuffer.setSize(resx, resy);
      this.renderTargetBlurBuffer1.setSize(resx, resy);
      this.renderTargetEdgeBuffer1.setSize(resx, resy);
      this.separableBlurMaterial1.uniforms['texSize'].value = new THREE.Vector2(
        resx,
        resy
      );

      resx = Math.round(resx / 2);
      resy = Math.round(resy / 2);

      this.renderTargetBlurBuffer2.setSize(resx, resy);
      this.renderTargetEdgeBuffer2.setSize(resx, resy);

      this.separableBlurMaterial2.uniforms['texSize'].value = new THREE.Vector2(
        resx,
        resy
      );
    },

    updateTextureMatrix: function() {
      this.textureMatrix.set(
        0.5,
        0.0,
        0.0,
        0.5,
        0.0,
        0.5,
        0.0,
        0.5,
        0.0,
        0.0,
        0.5,
        0.5,
        0.0,
        0.0,
        0.0,
        1.0
      );
      this.textureMatrix.multiply(this.camera.projectionMatrix);
      this.textureMatrix.multiply(this.camera.matrixWorldInverse);
    },

    render: function(renderer, writeBuffer, readBuffer, delta, maskActive) {
      if (this.selectedObjects.length === 0) return;
      var self = this;
      var selectedObjectsFilter = function(object) {
        for (var i = 0; i < self.selectedObjects.length; i++) {
          var selectedObject = self.selectedObjects[i];
          if (object.uuid === selectedObject.uuid) return true;
        }
        return false;
      };
      var nonSelectedObjectsFilter = function(object) {
        for (var i = 0; i < self.selectedObjects.length; i++) {
          var selectedObject = self.selectedObjects[i];
          if (object.uuid === selectedObject.uuid) return false;
        }
        return true;
      };

      this.oldClearColor.copy(renderer.getClearColor());
      this.oldClearAlpha = renderer.getClearAlpha();
      var oldAutoClear = renderer.autoClear;

      renderer.autoClear = false;

      if (maskActive) renderer.context.disable(renderer.context.STENCIL_TEST);

      renderer.setClearColor(0xffffff, 1);

      // Make selected objects invisible
      // 1. Draw Non Selected objects in the depth buffer
      this.renderScene.overrideMaterial = this.depthMaterial;
      renderer.render(
        this.renderScene,
        this.camera,
        this.renderTargetDepthBuffer,
        true,
        nonSelectedObjectsFilter
      );

      // Update Texture Matrix for Depth compare
      this.updateTextureMatrix();

      // Make non selected objects invisible, and draw only the selected objects, by comparing the depth buffer of non selected objects
      this.renderScene.overrideMaterial = this.prepareMaskMaterial;
      this.prepareMaskMaterial.uniforms[
        'cameraNearFar'
      ].value = new THREE.Vector2(this.camera.near, this.camera.far);
      this.prepareMaskMaterial.uniforms[
        'depthTexture'
      ].value = this.renderTargetDepthBuffer.texture;
      this.prepareMaskMaterial.uniforms[
        'textureMatrix'
      ].value = this.textureMatrix;
      renderer.render(
        this.renderScene,
        this.camera,
        this.renderTargetMaskBuffer,
        true,
        selectedObjectsFilter
      );
      this.renderScene.overrideMaterial = null;

      // 2. Downsample to Half resolution
      this.quad.material = this.materialCopy;
      this.copyUniforms['tDiffuse'].value = this.renderTargetMaskBuffer.texture;
      renderer.render(
        this.scene,
        this.orthoCamera,
        this.renderTargetMaskDownSampleBuffer,
        true
      );

      this.tempPulseColor1.copy(this.visibleEdgeColor);
      this.tempPulseColor2.copy(this.hiddenEdgeColor);

      if (this.pulsePeriod > 0) {
        var scalar =
          (1 + 0.25) / 2 +
          Math.cos(performance.now() * 0.01 / this.pulsePeriod) *
            (1.0 - 0.25) /
            2;
        this.tempPulseColor1.multiplyScalar(scalar);
        this.tempPulseColor2.multiplyScalar(scalar);
      }

      // 3. Apply Edge Detection Pass
      this.quad.material = this.edgeDetectionMaterial;
      this.edgeDetectionMaterial.uniforms[
        'maskTexture'
      ].value = this.renderTargetMaskDownSampleBuffer.texture;
      this.edgeDetectionMaterial.uniforms['texSize'].value = new THREE.Vector2(
        this.renderTargetMaskDownSampleBuffer.width,
        this.renderTargetMaskDownSampleBuffer.height
      );
      this.edgeDetectionMaterial.uniforms[
        'visibleEdgeColor'
      ].value = this.tempPulseColor1;
      this.edgeDetectionMaterial.uniforms[
        'hiddenEdgeColor'
      ].value = this.tempPulseColor2;
      renderer.render(
        this.scene,
        this.orthoCamera,
        this.renderTargetEdgeBuffer1,
        true
      );

      // 4. Apply Blur on Half res
      this.quad.material = this.separableBlurMaterial1;
      this.separableBlurMaterial1.uniforms[
        'colorTexture'
      ].value = this.renderTargetEdgeBuffer1.texture;
      this.separableBlurMaterial1.uniforms['direction'].value =
        THREE.OutlinePass.BlurDirectionX;
      this.separableBlurMaterial1.uniforms[
        'kernelRadius'
      ].value = this.edgeThickness;
      renderer.render(
        this.scene,
        this.orthoCamera,
        this.renderTargetBlurBuffer1,
        true
      );
      this.separableBlurMaterial1.uniforms[
        'colorTexture'
      ].value = this.renderTargetBlurBuffer1.texture;
      this.separableBlurMaterial1.uniforms['direction'].value =
        THREE.OutlinePass.BlurDirectionY;
      renderer.render(
        this.scene,
        this.orthoCamera,
        this.renderTargetEdgeBuffer1,
        true
      );

      // Apply Blur on quarter res
      this.quad.material = this.separableBlurMaterial2;
      this.separableBlurMaterial2.uniforms[
        'colorTexture'
      ].value = this.renderTargetEdgeBuffer1.texture;
      this.separableBlurMaterial2.uniforms['direction'].value =
        THREE.OutlinePass.BlurDirectionX;
      renderer.render(
        this.scene,
        this.orthoCamera,
        this.renderTargetBlurBuffer2,
        true
      );
      this.separableBlurMaterial2.uniforms[
        'colorTexture'
      ].value = this.renderTargetBlurBuffer2.texture;
      this.separableBlurMaterial2.uniforms['direction'].value =
        THREE.OutlinePass.BlurDirectionY;
      renderer.render(
        this.scene,
        this.orthoCamera,
        this.renderTargetEdgeBuffer2,
        true
      );

      // Blend it additively over the input texture
      this.quad.material = this.overlayMaterial;
      this.overlayMaterial.uniforms[
        'maskTexture'
      ].value = this.renderTargetMaskBuffer.texture;
      this.overlayMaterial.uniforms[
        'edgeTexture1'
      ].value = this.renderTargetEdgeBuffer1.texture;
      this.overlayMaterial.uniforms[
        'edgeTexture2'
      ].value = this.renderTargetEdgeBuffer2.texture;
      this.overlayMaterial.uniforms[
        'patternTexture'
      ].value = this.patternTexture;
      this.overlayMaterial.uniforms['edgeStrength'].value = this.edgeStrength;
      this.overlayMaterial.uniforms['edgeGlow'].value = this.edgeGlow;
      this.overlayMaterial.uniforms[
        'usePatternTexture'
      ].value = this.usePatternTexture;

      if (maskActive) renderer.context.enable(renderer.context.STENCIL_TEST);

      renderer.render(this.scene, this.orthoCamera, readBuffer, false);

      renderer.setClearColor(this.oldClearColor, this.oldClearAlpha);
      renderer.autoClear = oldAutoClear;
    },

    getPrepareMaskMaterial: function() {
      return new THREE.ShaderMaterial({
        uniforms: {
          depthTexture: { value: null },
          cameraNearFar: { value: new THREE.Vector2(0.5, 0.5) },
          textureMatrix: { value: new THREE.Matrix4() },
        },

        vertexShader:
          'varying vec2 vUv;\
				varying vec4 projTexCoord;\
				varying vec4 vPosition;\
				uniform mat4 textureMatrix;\
				void main() {\
					vUv = uv;\
					vPosition = modelViewMatrix * vec4( position, 1.0 );\
					vec4 worldPosition = modelMatrix * vec4( position, 1.0 );\
					projTexCoord = textureMatrix * worldPosition;\
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\
				}',

        fragmentShader:
          '#include <packing>\
				varying vec2 vUv;\
				varying vec4 vPosition;\
				varying vec4 projTexCoord;\
				uniform sampler2D depthTexture;\
				uniform vec2 cameraNearFar;\
				\
				void main() {\
					float depth = unpackRGBAToDepth(texture2DProj( depthTexture, projTexCoord ));\
					float viewZ = -perspectiveDepthToViewZ( depth, cameraNearFar.x, cameraNearFar.y );\
					float depthTest = (-vPosition.z > viewZ) ? 1.0 : 0.0;\
					gl_FragColor = vec4(0.0, depthTest, 1.0, 1.0);\
				}',
      });
    },

    getEdgeDetectionMaterial: function() {
      return new THREE.ShaderMaterial({
        uniforms: {
          maskTexture: { value: null },
          texSize: { value: new THREE.Vector2(0.5, 0.5) },
          visibleEdgeColor: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
          hiddenEdgeColor: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
        },

        vertexShader:
          'varying vec2 vUv;\n\
				void main() {\n\
					vUv = uv;\n\
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\
				}',

        fragmentShader:
          'varying vec2 vUv;\
				uniform sampler2D maskTexture;\
				uniform vec2 texSize;\
				uniform vec3 visibleEdgeColor;\
				uniform vec3 hiddenEdgeColor;\
				\
				void main() {\n\
					vec2 invSize = 1.0 / texSize;\
					vec4 uvOffset = vec4(1.0, 0.0, 0.0, 1.0) * vec4(invSize, invSize);\
					vec4 c1 = texture2D( maskTexture, vUv + uvOffset.xy);\
					vec4 c2 = texture2D( maskTexture, vUv - uvOffset.xy);\
					vec4 c3 = texture2D( maskTexture, vUv + uvOffset.yw);\
					vec4 c4 = texture2D( maskTexture, vUv - uvOffset.yw);\
					float diff1 = (c1.r - c2.r)*0.5;\
					float diff2 = (c3.r - c4.r)*0.5;\
					float d = length( vec2(diff1, diff2) );\
					float a1 = min(c1.g, c2.g);\
					float a2 = min(c3.g, c4.g);\
					float visibilityFactor = min(a1, a2);\
					vec3 edgeColor = 1.0 - visibilityFactor > 0.001 ? visibleEdgeColor : hiddenEdgeColor;\
					gl_FragColor = vec4(edgeColor, 1.0) * vec4(d);\
				}',
      });
    },

    getSeperableBlurMaterial: function(maxRadius) {
      return new THREE.ShaderMaterial({
        defines: {
          MAX_RADIUS: maxRadius,
        },

        uniforms: {
          colorTexture: { value: null },
          texSize: { value: new THREE.Vector2(0.5, 0.5) },
          direction: { value: new THREE.Vector2(0.5, 0.5) },
          kernelRadius: { value: 1.0 },
        },

        vertexShader:
          'varying vec2 vUv;\n\
				void main() {\n\
					vUv = uv;\n\
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\
				}',

        fragmentShader:
          '#include <common>\
				varying vec2 vUv;\
				uniform sampler2D colorTexture;\
				uniform vec2 texSize;\
				uniform vec2 direction;\
				uniform float kernelRadius;\
				\
				float gaussianPdf(in float x, in float sigma) {\
					return 0.39894 * exp( -0.5 * x * x/( sigma * sigma))/sigma;\
				}\
				void main() {\
					vec2 invSize = 1.0 / texSize;\
					float weightSum = gaussianPdf(0.0, kernelRadius);\
					vec4 diffuseSum = texture2D( colorTexture, vUv)* weightSum;\
					vec2 delta = direction * invSize * kernelRadius/float(MAX_RADIUS);\
					vec2 uvOffset = delta;\
					for( int i = 1; i <= MAX_RADIUS; i ++ ) {\
						float w = gaussianPdf(uvOffset.x, kernelRadius);\
						vec4 sample1 = texture2D( colorTexture, vUv + uvOffset);\
						vec4 sample2 = texture2D( colorTexture, vUv - uvOffset);\
						diffuseSum += ((sample1 + sample2) * w);\
						weightSum += (2.0 * w);\
						uvOffset += delta;\
					}\
					gl_FragColor = diffuseSum/weightSum;\
				}',
      });
    },

    getOverlayMaterial: function() {
      return new THREE.ShaderMaterial({
        uniforms: {
          maskTexture: { value: null },
          edgeTexture1: { value: null },
          edgeTexture2: { value: null },
          patternTexture: { value: null },
          edgeStrength: { value: 1.0 },
          edgeGlow: { value: 1.0 },
          usePatternTexture: { value: 0.0 },
        },

        vertexShader:
          'varying vec2 vUv;\n\
				void main() {\n\
					vUv = uv;\n\
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\
				}',

        fragmentShader:
          'varying vec2 vUv;\
				uniform sampler2D maskTexture;\
				uniform sampler2D edgeTexture1;\
				uniform sampler2D edgeTexture2;\
				uniform sampler2D patternTexture;\
				uniform float edgeStrength;\
				uniform float edgeGlow;\
				uniform bool usePatternTexture;\
				\
				void main() {\
					vec4 edgeValue1 = texture2D(edgeTexture1, vUv);\
					vec4 edgeValue2 = texture2D(edgeTexture2, vUv);\
					vec4 maskColor = texture2D(maskTexture, vUv);\
					vec4 patternColor = texture2D(patternTexture, 6.0 * vUv);\
					float visibilityFactor = 1.0 - maskColor.g > 0.0 ? 1.0 : 0.5;\
					vec4 edgeValue = edgeValue1 + edgeValue2 * edgeGlow;\
					vec4 finalColor = edgeStrength * maskColor.r * edgeValue;\
					if(usePatternTexture)\
						finalColor += + visibilityFactor * (1.0 - maskColor.r) * (1.0 - patternColor.r);\
					gl_FragColor = finalColor;\
				}',
        depthTest: false,
        depthWrite: false,
        transparent: true,
      });
    },
  }
);

THREE.OutlinePass.BlurDirectionX = new THREE.Vector2(1.0, 0.0);
THREE.OutlinePass.BlurDirectionY = new THREE.Vector2(0.0, 1.0);

// File:examples/js/effects/VREffect.js

/**
 * @author dmarcos / https://github.com/dmarcos
 * @author mrdoob / http://mrdoob.com
 *
 * WebVR Spec: http://mozvr.github.io/webvr-spec/webvr.html
 *
 * Firefox: http://mozvr.com/downloads/
 * Chromium: https://webvr.info/get-chrome
 *
 */

THREE.VREffect = function(renderer, onError) {
  var vrDisplay, vrDisplays;
  var eyeTranslationL = new THREE.Vector3();
  var eyeTranslationR = new THREE.Vector3();
  var renderRectL, renderRectR;

  var frameData = null;

  if ('VRFrameData' in window) {
    frameData = new window.VRFrameData();
  }

  function gotVRDisplays(displays) {
    vrDisplays = displays;

    if (displays.length > 0) {
      vrDisplay = displays[0];
    } else {
      if (onError) onError('HMD not available');
    }
  }

  if (navigator.getVRDisplays) {
    navigator
      .getVRDisplays()
      .then(gotVRDisplays)
      .catch(function() {
        console.warn('THREE.VREffect: Unable to get VR Displays');
      });
  }

  //

  this.isPresenting = false;
  this.scale = 1;

  var scope = this;

  var rendererSize = renderer.getSize();
  var rendererUpdateStyle = false;
  var rendererPixelRatio = renderer.getPixelRatio();

  this.getVRDisplay = function() {
    return vrDisplay;
  };

  this.setVRDisplay = function(value) {
    vrDisplay = value;
  };

  this.getVRDisplays = function() {
    console.warn('THREE.VREffect: getVRDisplays() is being deprecated.');
    return vrDisplays;
  };

  this.setSize = function(width, height, updateStyle) {
    rendererSize = { width: width, height: height };
    rendererUpdateStyle = updateStyle;

    if (scope.isPresenting) {
      var eyeParamsL = vrDisplay.getEyeParameters('left');
      renderer.setPixelRatio(1);
      renderer.setSize(
        eyeParamsL.renderWidth * 2,
        eyeParamsL.renderHeight,
        false
      );
    } else {
      renderer.setPixelRatio(rendererPixelRatio);
      renderer.setSize(width, height, updateStyle);
    }
  };

  // VR presentation

  var canvas = renderer.domElement;
  var defaultLeftBounds = [0.0, 0.0, 0.5, 1.0];
  var defaultRightBounds = [0.5, 0.0, 0.5, 1.0];

  function onVRDisplayPresentChange() {
    var wasPresenting = scope.isPresenting;
    scope.isPresenting = vrDisplay !== undefined && vrDisplay.isPresenting;

    if (scope.isPresenting) {
      var eyeParamsL = vrDisplay.getEyeParameters('left');
      var eyeWidth = eyeParamsL.renderWidth;
      var eyeHeight = eyeParamsL.renderHeight;

      if (!wasPresenting) {
        rendererPixelRatio = renderer.getPixelRatio();
        rendererSize = renderer.getSize();

        renderer.setPixelRatio(1);
        renderer.setSize(eyeWidth * 2, eyeHeight, false);
      }
    } else if (wasPresenting) {
      renderer.setPixelRatio(rendererPixelRatio);
      renderer.setSize(
        rendererSize.width,
        rendererSize.height,
        rendererUpdateStyle
      );
    }
  }

  window.addEventListener(
    'vrdisplaypresentchange',
    onVRDisplayPresentChange,
    false
  );

  this.setFullScreen = function(boolean) {
    return new Promise(function(resolve, reject) {
      if (vrDisplay === undefined) {
        reject(new Error('No VR hardware found.'));
        return;
      }

      if (scope.isPresenting === boolean) {
        resolve();
        return;
      }

      if (boolean) {
        resolve(vrDisplay.requestPresent([{ source: canvas }]));
      } else {
        resolve(vrDisplay.exitPresent());
      }
    });
  };

  this.requestPresent = function() {
    return this.setFullScreen(true);
  };

  this.exitPresent = function() {
    return this.setFullScreen(false);
  };

  this.requestAnimationFrame = function(f) {
    if (vrDisplay !== undefined) {
      return vrDisplay.requestAnimationFrame(f);
    } else {
      return window.requestAnimationFrame(f);
    }
  };

  this.cancelAnimationFrame = function(h) {
    if (vrDisplay !== undefined) {
      vrDisplay.cancelAnimationFrame(h);
    } else {
      window.cancelAnimationFrame(h);
    }
  };

  this.submitFrame = function() {
    if (vrDisplay !== undefined && scope.isPresenting) {
      vrDisplay.submitFrame();
    }
  };

  this.autoSubmitFrame = true;

  // render

  var cameraL = new THREE.PerspectiveCamera();
  cameraL.layers.enable(1);

  var cameraR = new THREE.PerspectiveCamera();
  cameraR.layers.enable(2);

  this.getCameraL = function() {
    return cameraL;
  };

  this.getCameraR = function() {
    return cameraR;
  };

  this.render = function(scene, camera, renderTarget, forceClear) {
    if (vrDisplay && scope.isPresenting) {
      var autoUpdate = scene.autoUpdate;

      if (autoUpdate) {
        scene.updateMatrixWorld();
        scene.autoUpdate = false;
      }

      var eyeParamsL = vrDisplay.getEyeParameters('left');
      var eyeParamsR = vrDisplay.getEyeParameters('right');

      eyeTranslationL.fromArray(eyeParamsL.offset);
      eyeTranslationR.fromArray(eyeParamsR.offset);

      if (Array.isArray(scene)) {
        console.warn(
          'THREE.VREffect.render() no longer supports arrays. Use object.layers instead.'
        );
        scene = scene[0];
      }

      // When rendering we don't care what the recommended size is, only what the actual size
      // of the backbuffer is.
      var size = renderer.getSize();
      var layers = vrDisplay.getLayers();
      var leftBounds;
      var rightBounds;

      if (layers.length) {
        var layer = layers[0];

        leftBounds =
          layer.leftBounds !== null && layer.leftBounds.length === 4
            ? layer.leftBounds
            : defaultLeftBounds;
        rightBounds =
          layer.rightBounds !== null && layer.rightBounds.length === 4
            ? layer.rightBounds
            : defaultRightBounds;
      } else {
        leftBounds = defaultLeftBounds;
        rightBounds = defaultRightBounds;
      }

      renderRectL = {
        x: Math.round(size.width * leftBounds[0]),
        y: Math.round(size.height * leftBounds[1]),
        width: Math.round(size.width * leftBounds[2]),
        height: Math.round(size.height * leftBounds[3]),
      };
      renderRectR = {
        x: Math.round(size.width * rightBounds[0]),
        y: Math.round(size.height * rightBounds[1]),
        width: Math.round(size.width * rightBounds[2]),
        height: Math.round(size.height * rightBounds[3]),
      };

      if (renderTarget) {
        renderer.setRenderTarget(renderTarget);
        renderTarget.scissorTest = true;
      } else {
        renderer.setRenderTarget(null);
        renderer.setScissorTest(true);
      }

      if (renderer.autoClear || forceClear) renderer.clear();

      if (camera.parent === null) camera.updateMatrixWorld();

      camera.matrixWorld.decompose(
        cameraL.position,
        cameraL.quaternion,
        cameraL.scale
      );
      camera.matrixWorld.decompose(
        cameraR.position,
        cameraR.quaternion,
        cameraR.scale
      );

      var scale = this.scale;
      cameraL.translateOnAxis(eyeTranslationL, scale);
      cameraR.translateOnAxis(eyeTranslationR, scale);

      if (vrDisplay.getFrameData) {
        vrDisplay.depthNear = camera.near;
        vrDisplay.depthFar = camera.far;

        vrDisplay.getFrameData(frameData);

        cameraL.projectionMatrix.elements = frameData.leftProjectionMatrix;
        cameraR.projectionMatrix.elements = frameData.rightProjectionMatrix;
      } else {
        cameraL.projectionMatrix = fovToProjection(
          eyeParamsL.fieldOfView,
          true,
          camera.near,
          camera.far
        );
        cameraR.projectionMatrix = fovToProjection(
          eyeParamsR.fieldOfView,
          true,
          camera.near,
          camera.far
        );
      }

      // render left eye
      if (renderTarget) {
        renderTarget.viewport.set(
          renderRectL.x,
          renderRectL.y,
          renderRectL.width,
          renderRectL.height
        );
        renderTarget.scissor.set(
          renderRectL.x,
          renderRectL.y,
          renderRectL.width,
          renderRectL.height
        );
      } else {
        renderer.setViewport(
          renderRectL.x,
          renderRectL.y,
          renderRectL.width,
          renderRectL.height
        );
        renderer.setScissor(
          renderRectL.x,
          renderRectL.y,
          renderRectL.width,
          renderRectL.height
        );
      }
      renderer.render(scene, cameraL, renderTarget, forceClear);

      // render right eye
      if (renderTarget) {
        renderTarget.viewport.set(
          renderRectR.x,
          renderRectR.y,
          renderRectR.width,
          renderRectR.height
        );
        renderTarget.scissor.set(
          renderRectR.x,
          renderRectR.y,
          renderRectR.width,
          renderRectR.height
        );
      } else {
        renderer.setViewport(
          renderRectR.x,
          renderRectR.y,
          renderRectR.width,
          renderRectR.height
        );
        renderer.setScissor(
          renderRectR.x,
          renderRectR.y,
          renderRectR.width,
          renderRectR.height
        );
      }
      renderer.render(scene, cameraR, renderTarget, forceClear);

      if (renderTarget) {
        renderTarget.viewport.set(0, 0, size.width, size.height);
        renderTarget.scissor.set(0, 0, size.width, size.height);
        renderTarget.scissorTest = false;
        renderer.setRenderTarget(null);
      } else {
        renderer.setViewport(0, 0, size.width, size.height);
        renderer.setScissorTest(false);
      }

      if (autoUpdate) {
        scene.autoUpdate = true;
      }

      if (scope.autoSubmitFrame) {
        scope.submitFrame();
      }

      return;
    }

    // Regular render mode if not HMD

    renderer.render(scene, camera, renderTarget, forceClear);
  };

  this.dispose = function() {
    window.removeEventListener(
      'vrdisplaypresentchange',
      onVRDisplayPresentChange,
      false
    );
  };

  //

  function fovToNDCScaleOffset(fov) {
    var pxscale = 2.0 / (fov.leftTan + fov.rightTan);
    var pxoffset = (fov.leftTan - fov.rightTan) * pxscale * 0.5;
    var pyscale = 2.0 / (fov.upTan + fov.downTan);
    var pyoffset = (fov.upTan - fov.downTan) * pyscale * 0.5;
    return { scale: [pxscale, pyscale], offset: [pxoffset, pyoffset] };
  }

  function fovPortToProjection(fov, rightHanded, zNear, zFar) {
    rightHanded = rightHanded === undefined ? true : rightHanded;
    zNear = zNear === undefined ? 0.01 : zNear;
    zFar = zFar === undefined ? 10000.0 : zFar;

    var handednessScale = rightHanded ? -1.0 : 1.0;

    // start with an identity matrix
    var mobj = new THREE.Matrix4();
    var m = mobj.elements;

    // and with scale/offset info for normalized device coords
    var scaleAndOffset = fovToNDCScaleOffset(fov);

    // X result, map clip edges to [-w,+w]
    m[0 * 4 + 0] = scaleAndOffset.scale[0];
    m[0 * 4 + 1] = 0.0;
    m[0 * 4 + 2] = scaleAndOffset.offset[0] * handednessScale;
    m[0 * 4 + 3] = 0.0;

    // Y result, map clip edges to [-w,+w]
    // Y offset is negated because this proj matrix transforms from world coords with Y=up,
    // but the NDC scaling has Y=down (thanks D3D?)
    m[1 * 4 + 0] = 0.0;
    m[1 * 4 + 1] = scaleAndOffset.scale[1];
    m[1 * 4 + 2] = -scaleAndOffset.offset[1] * handednessScale;
    m[1 * 4 + 3] = 0.0;

    // Z result (up to the app)
    m[2 * 4 + 0] = 0.0;
    m[2 * 4 + 1] = 0.0;
    m[2 * 4 + 2] = zFar / (zNear - zFar) * -handednessScale;
    m[2 * 4 + 3] = zFar * zNear / (zNear - zFar);

    // W result (= Z in)
    m[3 * 4 + 0] = 0.0;
    m[3 * 4 + 1] = 0.0;
    m[3 * 4 + 2] = handednessScale;
    m[3 * 4 + 3] = 0.0;

    mobj.transpose();

    return mobj;
  }

  function fovToProjection(fov, rightHanded, zNear, zFar) {
    var DEG2RAD = Math.PI / 180.0;

    var fovPort = {
      upTan: Math.tan(fov.upDegrees * DEG2RAD),
      downTan: Math.tan(fov.downDegrees * DEG2RAD),
      leftTan: Math.tan(fov.leftDegrees * DEG2RAD),
      rightTan: Math.tan(fov.rightDegrees * DEG2RAD),
    };

    return fovPortToProjection(fovPort, rightHanded, zNear, zFar);
  }
};

// File:examples/js/controls/VRControls.js

/**
 * @author dmarcos / https://github.com/dmarcos
 * @author mrdoob / http://mrdoob.com
 */

THREE.VRControls = function(object, onError) {
  var scope = this;

  var vrDisplay, vrDisplays;

  var standingMatrix = new THREE.Matrix4();

  var frameData = null;

  if ('VRFrameData' in window) {
    frameData = new VRFrameData();
  }

  function gotVRDisplays(displays) {
    vrDisplays = displays;

    if (displays.length > 0) {
      vrDisplay = displays[0];
    } else {
      if (onError) onError('VR input not available.');
    }
  }

  if (navigator.getVRDisplays) {
    navigator
      .getVRDisplays()
      .then(gotVRDisplays)
      .catch(function() {
        console.warn('THREE.VRControls: Unable to get VR Displays');
      });
  }

  // the Rift SDK returns the position in meters
  // this scale factor allows the user to define how meters
  // are converted to scene units.

  this.scale = 1;

  // If true will use "standing space" coordinate system where y=0 is the
  // floor and x=0, z=0 is the center of the room.
  this.standing = false;

  // Distance from the users eyes to the floor in meters. Used when
  // standing=true but the VRDisplay doesn't provide stageParameters.
  this.userHeight = 1.6;

  this.getVRDisplay = function() {
    return vrDisplay;
  };

  this.setVRDisplay = function(value) {
    vrDisplay = value;
  };

  this.getVRDisplays = function() {
    console.warn('THREE.VRControls: getVRDisplays() is being deprecated.');
    return vrDisplays;
  };

  this.getStandingMatrix = function() {
    return standingMatrix;
  };

  this.update = function() {
    if (vrDisplay) {
      var pose;

      if (vrDisplay.getImmediatePose) {
        pose = vrDisplay.getImmediatePose();
      } else if (vrDisplay.getFrameData) {
        vrDisplay.getFrameData(frameData);
        pose = frameData.pose;
      } else if (vrDisplay.getPose) {
        pose = vrDisplay.getPose();
      }

      if (pose.orientation !== null) {
        object.quaternion.fromArray(pose.orientation);
      } else {
        object.quaternion.set(0, 0, 0, 1);
      }

      if (pose.position !== null) {
        object.position.fromArray(pose.position);
      } else {
        object.position.set(0, 0, 0);
      }

      if (this.standing) {
        if (vrDisplay.stageParameters) {
          object.updateMatrix();

          standingMatrix.fromArray(
            vrDisplay.stageParameters.sittingToStandingTransform
          );
          object.applyMatrix(standingMatrix);
        } else {
          object.position.setY(object.position.y + this.userHeight);
        }
      }

      object.position.multiplyScalar(scope.scale);
    }
  };

  this.resetPose = function() {
    if (vrDisplay) {
      vrDisplay.resetPose();
    }
  };

  this.resetSensor = function() {
    console.warn('THREE.VRControls: .resetSensor() is now .resetPose().');
    this.resetPose();
  };

  this.zeroSensor = function() {
    console.warn('THREE.VRControls: .zeroSensor() is now .resetPose().');
    this.resetPose();
  };

  this.dispose = function() {
    vrDisplay = null;
  };
};

// File:examples/js/vr/VRController.js

/**
 * @author mrdoob / http://mrdoob.com
 * @author stewdio / http://stewd.io
 */

THREE.VRController = function(id, index) {
  THREE.Object3D.call(this);

  var scope = this;
  var gamepad;

  var axes = [0, 0];
  var thumbpadIsPressed = false;
  var triggerIsPressed = false;
  var gripsArePressed = false;
  var menuIsPressed = false;
  if (index === undefined) index = 0;
  function findGamepad(id) {
    // Iterate across gamepads as Vive Controllers may not be
    // in position 0 and 1.

    var gamepads = navigator.getGamepads();

    for (var i = 0, j = 0; i < 4; i++) {
      var gamepad = gamepads[i];

      if (gamepad && gamepad.id === id) {
        if (j === index) return gamepad;

        j++;
      }
    }
  }

  this.matrixAutoUpdate = false;
  this.standingMatrix = new THREE.Matrix4();

  this.getGamepad = function() {
    return gamepad;
  };

  this.getButtonState = function(button) {
    if (button === 'thumbpad') return thumbpadIsPressed;
    if (button === 'trigger') return triggerIsPressed;
    if (button === 'grips') return gripsArePressed;
    if (button === 'menu') return menuIsPressed;
  };

  this.update = function() {
    gamepad = findGamepad(id, index);

    if (gamepad !== undefined && gamepad.pose) {
      //  Position and orientation.

      var pose = gamepad.pose;
      if (gamepad.pose.position !== null) {
        scope.position.fromArray(pose.position);
      } else {
        scope.position.fromArray([0, 1, 0.0]);
      }

      if (gamepad.pose.orientation !== null) {
        scope.quaternion.fromArray(pose.orientation);
      } else {
        scope.quaternion.set(0, 0, 0, 1);
      }
      scope.matrix.compose(scope.position, scope.quaternion, scope.scale);
      scope.matrix.multiplyMatrices(scope.standingMatrix, scope.matrix);
      scope.matrix.decompose(scope.position, scope.quaternion, scope.scale);
      scope.matrixWorldNeedsUpdate = true;
      scope.visible = true;
    } else {
      scope.visible = false;
    }

    //  Thumbpad and Buttons.
    if (gamepad) {
      if (
        gamepad.axes &&
        (axes[0] !== gamepad.axes[0] || axes[1] !== gamepad.axes[1])
      ) {
        axes[0] = gamepad.axes[0]; //  X axis: -1 = Left, +1 = Right.
        axes[1] = gamepad.axes[1]; //  Y axis: -1 = Bottom, +1 = Top.
        scope.dispatchEvent({ type: 'axischanged', axes: axes });
      }

      if (
        gamepad.buttons[0] &&
        thumbpadIsPressed !== gamepad.buttons[0].pressed
      ) {
        thumbpadIsPressed = gamepad.buttons[0].pressed;
        var event = new Event(
          thumbpadIsPressed ? 'thumbpaddown' : 'thumbpadup'
        );
        //window.dispatchEvent( { type: thumbpadIsPressed ? 'thumbpaddown' : 'thumbpadup' } );
        window.dispatchEvent(event);
      }

      if (
        gamepad.buttons[1] &&
        triggerIsPressed !== gamepad.buttons[1].pressed
      ) {
        triggerIsPressed = gamepad.buttons[1].pressed;
        //scope.dispatchEvent( { type: triggerIsPressed ? 'triggerdown' : 'triggerup' } );
        var event = new Event(triggerIsPressed ? 'triggerdown' : 'triggerup');
        window.dispatchEvent(event);
      }

      if (
        gamepad.buttons[2] &&
        gripsArePressed !== gamepad.buttons[2].pressed
      ) {
        gripsArePressed = gamepad.buttons[2].pressed;
        //scope.dispatchEvent( { type: gripsArePressed ? 'gripsdown' : 'gripsup' } );
        var event = new Event(gripsArePressed ? 'gripsdown' : 'gripsup');
        window.dispatchEvent(event);
      }

      if (gamepad.buttons[3] && menuIsPressed !== gamepad.buttons[3].pressed) {
        menuIsPressed = gamepad.buttons[3].pressed;
        //scope.dispatchEvent( { type: menuIsPressed ? 'menudown' : 'menuup' } );
        var event = new Event(menuIsPressed ? 'menudown' : 'menuup');
        window.dispatchEvent(event);
      }
    }
  };
};

THREE.VRController.prototype = Object.create(THREE.Object3D.prototype);
THREE.VRController.prototype.constructor = THREE.VRController;

// File:examples/js/shaders/GeometricRefractionShader.js

/**
 * @author prashantsharma
 * @author bhouston
 *
 * Geometric refraction shader
 */

THREE.GeometricRefractionShader = {
  defines: {
    NUM_BOUNCES: 4,
  },

  extensions: {
    derivatives: true,
  },

  side: THREE.DoubleSide,

  uniforms: THREE.UniformsUtils.merge([
    THREE.UniformsLib.common,
    {
      normalCubeMap: { value: null },
      bDebugBounces: { value: false },
      rIndexDelta: { value: 0.03 },
      envMapIntensity: { value: 1.0 },
      gemIOR: { value: 1.0 },
      absorption: { value: new THREE.Vector3(0.0, 0.8, 0.8) },
      boostFactor: { value: 1.0 },
      boostColor: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
      spectrumSpread: { value: 0.0 },
      sphereSquish: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
      boundingSphere: { value: new THREE.Vector4(0.0, 0.0, 0.0, 1.0) },
    },
  ]),

  vertexShader: [
    'varying vec3 vPosition;',
    'varying vec3 vNormal;',

    'void main() {',
    'vPosition = position;',
    'vNormal = normal;',
    'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
    '}',
  ].join('\n'),

  fragmentShader: [
    '#include <common>',
    '#include <bsdfs>',
    '#include <packing>',

    'varying vec3 vPosition;',
    'varying vec3 vNormal;',

    'uniform float gemIOR;',
    'uniform float boostFactor;',
    'uniform vec3 boostColor;',
    'uniform float spectrumSpread;',
    'uniform vec3 absorption;',
    'uniform vec3 sphereSquish;',
    'uniform vec4 boundingSphere;', // xyz: Position, w: Radius

    'uniform samplerCube normalCubeMap;',
    'uniform mat4 modelMatrix;',
    'uniform mat4 modelMatrixInverse;',

    'const float airIOR = 1.0;',

    '#include <envmap_pars_fragment>',
    '#include <cube_uv_reflection_fragment>',

    'struct Ray3 { vec3 origin; vec3 direction; };',

    'void setRay( out Ray3 resultRay, in vec3 origin, in vec3 direction ) {',

    'resultRay.origin = origin;',
    'resultRay.direction = normalize( direction );',

    '}',

    'vec3 rayIntersectSquishedSphere( in Ray3 ray ) {',

    'vec3 squishedDirection = ray.direction / sphereSquish;',
    'float A = dot( squishedDirection, squishedDirection );',
    'float B = 2.0 * dot( ray.origin, squishedDirection );',
    'float C = dot( ray.origin, ray.origin ) - 1.0;',

    'float disc = pow2( B ) - 4.0 * A * C;',

    'if( disc > 0.0 ) {',

    'disc = sqrt( disc );',
    'float t1 = ( -B + disc ) * 0.5 / A;',
    'float t2 = ( -B - disc ) * 0.5 / A;',
    'float t = ( t1 > t2 ) ? t1 : t2;',

    'return vec3( ray.origin + ray.direction * t );',

    '}',

    'return vec3( 0.0 );',

    '}',

    'vec3 queryEnvMapLocal( vec3 localNormal ) {',

    'vec3 worldNormal = transformDirection( localNormal, modelMatrix );',

    'vec3 queryVec = vec3( flipEnvMap * worldNormal.x, worldNormal.y, flipEnvMap * worldNormal.z );',

    '#ifdef ENVMAP_TYPE_CUBE',

    'vec3 envColor = envMapIntensity * envMapTexelToLinear( textureCube( envMap, queryVec ) ).rgb;',

    '#elif defined( ENVMAP_TYPE_CUBE_UV )',

    'vec3 envColor = envMapIntensity * textureCubeUV(queryVec, localNormal, 0.0).rgb;',

    '#endif',

    'return envColor;',
    '}',

    // https://en.wikipedia.org/wiki/Fresnel_equations
    'float fresnelReflectance( float n0, float n1, vec3 incident, vec3 refracted, vec3 normal ) {',

    'float cosI = dot( incident, normal );',
    'float cosT = dot( refracted, normal );',

    'float Rs = pow2( ( n0 * cosI - n1 * cosT ) / ( abs( n0 * cosI + n1 * cosT ) + 0.000001 ) );',
    'float Rp = pow2( ( n0 * cosT - n1 * cosI ) / ( abs( n0 * cosT + n1 * cosI ) + 0.000001 ) );',

    'return 0.5 * ( Rs + Rp );',

    '}',

    'vec3 traceRay( Ray3 incidentRay, vec3 diamondNormal ) {',

    'float reflectance;',
    'vec3 result = vec3( 0.0 );',
    'vec3 transmittance = vec3( 1.0 );',
    'Ray3 refractedRay, reflectedRay;',

    // external ray hitting the surface of the diamond

    'setRay( refractedRay, incidentRay.origin, refract( incidentRay.direction, diamondNormal, airIOR/gemIOR ) );',
    'setRay( reflectedRay, incidentRay.origin, reflect( incidentRay.direction, diamondNormal ) );',

    'reflectance = fresnelReflectance( airIOR, gemIOR, incidentRay.direction, refractedRay.direction, diamondNormal );',
    'result += queryEnvMapLocal( reflectedRay.direction ) * reflectance;',
    'transmittance *= ( 1.0 - reflectance );',

    // refracted ray becomes the incident ray once we are inside the diamond
    'incidentRay = refractedRay;',

    'for( int bounce = 0; bounce < NUM_BOUNCES; bounce ++ ) {',

    // figure out bounce location
    'vec3 pointOnUnitSphere = rayIntersectSquishedSphere( incidentRay );',
    // get diamond normal and invert it to be inward facing
    'vec4 gemstoneNormal = textureCube( normalCubeMap, pointOnUnitSphere );',
    'vec3 inwardDiamondNormal = - normalize( unpackRGBToNormal( gemstoneNormal.rgb ) );',

    // advance the start point of the next ray cast to the surface of the diamond gem,
    // reduces the size of the point when viewing the front of round diamonds.
    'vec3 pointOnGemStone = pointOnUnitSphere;// * gemstoneNormal.a;',

    // absorption along this ray segment.
    'float raySegmentLength = length( pointOnGemStone - incidentRay.origin );',
    'transmittance *= exp( -raySegmentLength * absorption );',

    // internal ray hitting the surface of the diamond
    'setRay( refractedRay, pointOnGemStone, refract( incidentRay.direction, inwardDiamondNormal, gemIOR/airIOR ) );',
    'setRay( reflectedRay, pointOnGemStone, reflect( incidentRay.direction, inwardDiamondNormal ) );',

    'reflectance = fresnelReflectance( gemIOR, airIOR, -incidentRay.direction, refractedRay.direction, inwardDiamondNormal );',

    // another check for internal reflection? argh.
    'if( reflectance >= 0.0 && reflectance < 0.99 ) {',
    'vec3 refractedColor = vec3( 0 );',
    'refractedColor.g = queryEnvMapLocal( refractedRay.direction ).g;',
    'setRay( refractedRay, pointOnGemStone, refract( incidentRay.direction, inwardDiamondNormal, (gemIOR+spectrumSpread*0.075)/airIOR ) );',
    'refractedColor.r = queryEnvMapLocal( refractedRay.direction ).r;',
    'setRay( refractedRay, pointOnGemStone, refract( incidentRay.direction, inwardDiamondNormal, (gemIOR-spectrumSpread*0.05)/airIOR ) );',
    'refractedColor.b = queryEnvMapLocal( refractedRay.direction ).b;',
    'result += refractedColor * transmittance * ( 1.0 - reflectance ) * boostFactor * boostColor;',
    '}',
    'else {',
    'reflectance = 1.0;',
    'if( bounce == NUM_BOUNCES - 1 ) {',
    'result += queryEnvMapLocal( incidentRay.direction )* transmittance * boostFactor * boostColor;',

    '}',
    '}',

    // light further backtraced has to reflect off this surface.
    'transmittance *= reflectance;',
    'incidentRay = reflectedRay;',

    '}',

    'return result;',

    '}',

    'void main() {',

    // worldToLocal
    'vec3 localCameraPosition = transformPosition( cameraPosition, modelMatrixInverse );',
    'vec3 localRayDirection = normalize( vPosition - localCameraPosition );',

    // localToUnit
    // NOTE: this normalization is incorrect, but it reduces the visibility of the point from the front of round diamonds.
    'vec3 unitPosition = ( vPosition - boundingSphere.xyz ) / boundingSphere.w;',

    'Ray3 incidentRay;',
    'setRay( incidentRay, unitPosition, localRayDirection );',

    'vec3 color = traceRay( incidentRay, vNormal );',
    'gl_FragColor = vec4( toneMapping( color.rgb ), 1.0 );',

    '}',
  ].join('\n\n'),
};

// File:examples/js/shaders/GeometricNormalCaptureShader.js

/**
 * @author prashantsharma
 * @author bhouston
 *
 * Geometric normal capture shader
 */

THREE.GeometricNormalCaptureShader = {
  side: THREE.DoubleSide,

  vertexShader: [
    'varying vec3 vNormal;',
    'varying vec3 vPosition;',

    'void main() {',
    'vNormal = normal;',
    'vec4 tempPosition = modelViewMatrix * vec4( position, 1.0 );',
    'gl_Position = projectionMatrix * tempPosition;',
    'vPosition = tempPosition.xyz;',
    '}',
  ].join('\n'),

  fragmentShader: [
    '#include <packing>',

    'varying vec3 vNormal;',
    'varying vec3 vPosition;',

    'void main() {',

    'float offsetDistance = max( length( vPosition ), 0.0 );',
    'gl_FragColor = vec4( packNormalToRGB( vNormal ), offsetDistance );',

    '}',
  ].join('\n'),
};

// File:examples/js/shaders/NoiseShader.js

/**
 * Full-screen noise texture
 */

THREE.NoiseShader = {
  uniforms: {},

  vertexShader: [
    'varying vec2 vUv;',

    'void main() {',

    'vUv = uv;',
    'gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',

    '}',
  ].join('\n'),

  fragmentShader: [
    '#include <common>',

    'varying vec2 vUv;',

    'void main() {',

    'gl_FragColor = vec4(rand(vUv), vec3(0.0));',

    '}',
  ].join('\n'),
};

// File:examples/js/diamond/Sparkles.js

var SparkleMaterial = {
  blending: THREE.NormalBlending,
  side: THREE.DoubleSide,

  premultipliedAlpha: true,

  side: THREE.DoubleSide,

  depthTest: false,
  depthWrite: false,
  transparent: true,
  uniforms: {
    ModelViewMatrix: { type: 'm4', value: new THREE.Matrix4().identity() },
    sparkleTexture: { type: 't', value: null },
    screenTexture: { type: 't', value: null },
    noiseTexture: { type: 't', value: null },
    scale: { type: 'f', value: 1.0 },
    intensity: { type: 'f', value: 1.0 },
  },

  vertexShader:
    'varying vec2 vUv;\n\
      varying vec2 sparkleCentreUV;\n\
      uniform mat4 ModelViewMatrix;\n\
      uniform float scale;\n\
      \n\
      void main() {\n\
          vUv = uv;\n\
          vec2 alignedPosition = position.xy * scale;\n\
          vec4 finalPosition = ModelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );\n\
          finalPosition.xy += alignedPosition;\n\
          finalPosition = projectionMatrix * finalPosition;\n\
          vec4 sparkleProjectedCentre = projectionMatrix * ModelViewMatrix * vec4(0.0,0.0,0.0,1.0);\n\
          sparkleCentreUV = (sparkleProjectedCentre.xy/sparkleProjectedCentre.w + 1.0)*0.5;\n\
          gl_Position = finalPosition;\n\
      }',

  fragmentShader:
    '#include <common>\n\
     varying vec2 vUv;\n\
     varying vec2 sparkleCentreUV;\n\
     uniform sampler2D sparkleTexture;\n\
     uniform sampler2D screenTexture;\n\
     uniform sampler2D noiseTexture;\n\
     uniform float intensity;\n\
     \n\
     void main() {\n\
          vec4 screenColor = texture2D( screenTexture, sparkleCentreUV );\n\
          float screenIntensity = pow( average( screenColor.xyz ), 3.0 );\n\
          float noise = texture2D( noiseTexture, sparkleCentreUV ).r;\n\
          gl_FragColor = vec4( texture2D( sparkleTexture, vUv ).a * screenIntensity * noise * intensity );\n\
    }',
};

THREE.Sparkle = function(sparkleTexture) {
  this.texture = sparkleTexture;
  this.geometry = new THREE.PlaneGeometry(1, 1, 0);

  this.material = new THREE.ShaderMaterial(SparkleMaterial);

  this.material.uniforms = THREE.UniformsUtils.clone(SparkleMaterial.uniforms);
  if (this.texture !== undefined) {
    this.material.uniforms['sparkleTexture'].value = sparkleTexture;
  }

  this.mesh = new THREE.Mesh(this.geometry, this.material);
  this.rotationSpeedFactor = 5;
};

THREE.Sparkle.prototype = {
  constructor: THREE.Sparkle,

  shallowCopy: function() {
    var sparkle = new THREE.Sparkle(this.texture);
    sparkle.mesh.position.copy(this.mesh.position);
    sparkle.mesh.quaternion.copy(this.mesh.quaternion);
    sparkle.mesh.scale.copy(this.mesh.scale);
    sparkle.material.uniforms['scale'].value = this.material.uniforms[
      'scale'
    ].value;
    sparkle.material.uniforms['intensity'].value = this.material.uniforms[
      'intensity'
    ].value;
    sparkle.material.uniforms['screenTexture'].value = this.material.uniforms[
      'screenTexture'
    ].value;
    sparkle.material.uniforms['noiseTexture'].value = this.material.uniforms[
      'noiseTexture'
    ].value;
    sparkle.material.uniforms['ModelViewMatrix'].value.copy(
      this.material.uniforms['ModelViewMatrix'].value
    );
    sparkle.rotationSpeedFactor = this.rotationSpeedFactor;
    return sparkle;
  },

  setScale: function(scale) {
    this.material.uniforms['scale'].value = scale;
  },
  setIntensity: function(intensity) {
    this.material.uniforms['intensity'].value = intensity;
  },

  alignWithCamera: function(camera, originalMesh) {
    this.mesh.modelViewMatrix.multiplyMatrices(
      camera.matrixWorldInverse,
      originalMesh.matrixWorld
    );
    this.mesh.modelViewMatrix.multiplyMatrices(
      this.mesh.modelViewMatrix,
      this.mesh.matrix
    );
    this.material.uniforms['ModelViewMatrix'].value.copy(
      this.mesh.modelViewMatrix
    );
  },
};

// File:examples/js/diamond/NormalCubeMapBaker.js

THREE.NormalCubeMapBaker = function(renderer, geometry, isFlat) {
  var normalCaptureMaterial = new THREE.ShaderMaterial(
    THREE.GeometricNormalCaptureShader
  );
  normalCaptureMaterial.blending = THREE.NoBlending;

  var localGeometry = geometry; //.clone();
  // localGeometry.center();
  localGeometry.computeBoundingSphere();
  // console.log( 'geometry.boundingSphere', localGeometry.boundingSphere );
  var translationMatrix = new THREE.Matrix4().setPosition(
    localGeometry.boundingSphere.center.clone().negate()
  );
  var scaleFactor = 1.0 / localGeometry.boundingSphere.radius;
  var scaleMatrix = new THREE.Matrix4().makeScale(
    scaleFactor,
    scaleFactor,
    scaleFactor
  );
  var combinedXfrm = new THREE.Matrix4().multiplyMatrices(
    scaleMatrix,
    translationMatrix
  );

  var position = new THREE.Vector3(),
    quaternion = new THREE.Quaternion(),
    scale = new THREE.Vector3();
  combinedXfrm.decompose(position, quaternion, scale);
  var mesh = new THREE.Mesh(localGeometry, normalCaptureMaterial);
  mesh.position.copy(position);
  mesh.scale.copy(scale);
  // console.log( 'mesh', mesh );

  var bakeScene = new THREE.Scene();
  bakeScene.add(mesh);

  var floatLinearTextureSupport =
    renderer.extensions.get('OES_texture_float') &&
    renderer.extensions.get('OES_texture_float_linear');
  var cubeCamera = new THREE.CubeCamera(0.01, 100, 512);
  cubeCamera.renderTarget.texture.generateMipmaps = false; //true;
  //cubeCamera.renderTarget.texture.anisotropy = 16;

  // should be linear if smooth, nearest if flat sided.
  cubeCamera.renderTarget.texture.magFilter = isFlat
    ? THREE.NearestFilter
    : THREE.LinearFilter;
  cubeCamera.renderTarget.texture.minFilter = isFlat
    ? THREE.NearestFilter
    : THREE.LinearFilter;
  cubeCamera.renderTarget.texture.format = THREE.RGBAFormat;
  // NOTE: THREE.FloatType is failing on iOS for some reason.
  cubeCamera.renderTarget.texture.type =
    floatLinearTextureSupport && !isFlat
      ? THREE.FloatType
      : THREE.UnsignedByteType;

  cubeCamera.updateCubeMap(renderer, bakeScene);

  this.texture = cubeCamera.renderTarget.texture;

  // console.log( "NormalCubeMapBaker result: ", this.texture );
};

// File:examples/js/postprocessing/OITRenderPass.js

THREE.OITRenderPass = function(
  scene,
  camera,
  renderer,
  overrideMaterial,
  clearColor,
  clearAlpha
) {
  var extensions = renderer.extensions;
  var params = {};
  var halfFloatFragmentTextures = !!extensions.get('OES_texture_half_float');
  if (halfFloatFragmentTextures) {
    params.type = THREE.HalfFloatType;
  } else {
    var floatFragmentTextures = !!extensions.get('OES_texture_float');
    if (floatFragmentTextures) {
      params.type = THREE.FloatType;
    } else {
      console.log(
        'OIT Needs either Float or Half Float texture support, using general render'
      );
    }
  }

  var depthTextureSupport = !!extensions.get('WEBGL_depth_texture');
  if (!depthTextureSupport) {
    console.warn('OIT Needs support of Depth Texture');
  }

  this.scene = scene;
  this.camera = camera;
  this.renderOver = false;

  this.overrideMaterial = overrideMaterial;

  this.clearColor = clearColor;
  this.clearAlpha = clearAlpha !== undefined ? clearAlpha : 0;

  this.clear = false;
  this.clearDepth = false;
  this.needsSwap = false;

  this.opaqueRT = new THREE.WebGLRenderTarget(0, 0, {
    type: THREE.UnsignedByteType,
  });
  this.accumulateRT = new THREE.WebGLRenderTarget(0, 0, params);
  this.revealageRT = new THREE.WebGLRenderTarget(0, 0, {
    type: THREE.UnsignedByteType,
  });
  this.depthTexture = new THREE.DepthTexture();

  this.opaqueRT.depthTexture = this.depthTexture;
  this.accumulateRT.depthTexture = this.depthTexture;
  this.revealageRT.depthTexture = this.depthTexture;

  this.mergeMaterial = new THREE.ShaderMaterial({
    uniforms: {
      accumulationTexture: { value: null },
      revealageTexture: { value: null },
      opaqueTexture: { value: null },
    },

    vertexShader:
      'varying vec2 vUv;\n\
    void main() {\n\
      vUv = uv;\n\
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\
    }',

    fragmentShader:
      'varying vec2 vUv;\
    uniform sampler2D opaqueTexture;\
    uniform sampler2D accumulationTexture;\
    uniform sampler2D revealageTexture;\
    void main() { \
      vec4 accumulationColor = texture2D( accumulationTexture, vUv );\
      vec4 revealage = texture2D( revealageTexture, vUv );\
      vec4 opaqueColor = texture2D( opaqueTexture, vUv );\
      vec3 transparentColor = pow(vec3(accumulationColor.rgb / max(accumulationColor.a, 1e-5)), vec3(1.0));\
      vec3 finalColor = opaqueColor.rgb * revealage.r + (1.0 - revealage.r) * transparentColor;\
      gl_FragColor = vec4( finalColor, opaqueColor.a + accumulationColor.a);\
    }\
    ',
  });

  this.mergeMaterial.uniforms[
    'accumulationTexture'
  ].value = this.accumulateRT.texture;
  this.mergeMaterial.uniforms[
    'revealageTexture'
  ].value = this.revealageRT.texture;
  this.mergeMaterial.uniforms['opaqueTexture'].value = this.opaqueRT.texture;

  this.copyMaterial = new THREE.ShaderMaterial(THREE.CopyShader);
  this.copyMaterial.uniforms = THREE.UniformsUtils.clone(
    this.copyMaterial.uniforms
  );

  if (THREE.CopyShader === undefined)
    console.error('THREE.OITRenderPass relies on THREE.CopyShader');

  this.blendFactorsMap = [];
  this.PASS_TYPE_ACCUM = 0;
  this.PASS_TYPE_REVEALAGE = 1;
  this.BlendStates = [];
  this.BlendStates[this.PASS_TYPE_ACCUM] = {
    blending: THREE.NormalBlending,
    premultipliedAlpha: false,
  };
  this.BlendStates[this.PASS_TYPE_REVEALAGE] = {
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.ZeroFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendEquationAlpha: THREE.AddEquation,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneFactor,
    premultipliedAlpha: false,
  };
};

THREE.OITRenderPass.prototype = {
  constructor: THREE.OITRenderPass,

  setSize: function(width, height) {
    this.opaqueRT.setSize(width, height);
    this.accumulateRT.setSize(width, height);
    this.revealageRT.setSize(width, height);
  },

  render: function(renderer, writeBuffer, readBuffer, delta, maskActive) {
    var autoClear = renderer.autoClear;
    renderer.autoClear = false;

    var autoClearDepth = renderer.autoClearDepth;
    var autoClearColor = renderer.autoCleraColor;
    var transparentFilter = function(obj) {
      return obj.material.transparent;
    };
    var opaqueFilter = function(obj) {
      return !obj.material.transparent;
    };
    //----------------------------------------------------------------------------------------
    renderer.projectObject(this.scene, this.camera);

    if (renderer.transparentObjects.length === 0) {
      renderer.autoClearColor = false;
      renderer.render(this.scene, this.camera, readBuffer, true, false, true);
      renderer.autoClearColor = autoClearColor;
      return;
    }
    // Copy the readBuffer into opaque target. This is needed to copy the result of earlier passes(eg Texture Pass).
    // TODO. Should use the readbuffer itself to render the opaque objects into. depthTexture can be assigned to readbuffer
    // for the purpose of depth comparisions for transparent objects. I spent some time on it, but something was wrong with the
    // depth texture and it wasn't working properly. IF it works, it can save us a copy pass, and memory of a renderTarget.
    this.copyMaterial.uniforms['tDiffuse'].value = readBuffer.texture;
    renderer.renderPass(this.copyMaterial, this.opaqueRT);

    // Render Opaque objects.
    renderer.autoClearColor = false;
    renderer.render(this.scene, this.camera, this.opaqueRT, true, opaqueFilter);
    renderer.autoClearColor = autoClearColor;

    // Render Transparent objects, and accumulate colors in accumulation, and alpha in revealage.
    renderer.autoClearDepth = false;

    this.changeBlendState(renderer.transparentObjects, this.PASS_TYPE_ACCUM);
    renderer.oitMode = 0;
    renderer.setClearColor(0xffffff, 0);
    renderer.render(
      this.scene,
      this.camera,
      this.accumulateRT,
      true,
      transparentFilter
    );

    this.changeBlendState(
      renderer.transparentObjects,
      this.PASS_TYPE_REVEALAGE
    );
    renderer.oitMode = 1;
    renderer.setClearColor(0xffffff, 1);
    renderer.render(
      this.scene,
      this.camera,
      this.revealageRT,
      true,
      transparentFilter
    );

    this.restoreBlendState(renderer.transparentObjects);

    renderer.autoClearDepth = autoClearDepth;

    renderer.renderPass(this.mergeMaterial, readBuffer, false);
    //----------------------------------------------------------------------------------------
    renderer.autoClear = autoClear;
    renderer.oitMode = 2;
  },

  changeBlendState: function(transparentList, passType) {
    if (
      passType === undefined ||
      (passType !== this.PASS_TYPE_ACCUM &&
        passType !== this.PASS_TYPE_REVEALAGE)
    ) {
      console.log('WebGLOrderIndependentTransparency::Invalid passType');
      return;
    }

    this.blendFactorsMap = [];
    var newBlendState = this.BlendStates[passType];
    for (var i = 0, l = transparentList.length; i < l; i++) {
      var renderItem = transparentList[i];
      var material = renderItem.material;
      var blendState = {
        blending: material.blending,
        blendEquation: material.blendEquation,
        blendSrc: material.blendSrc,
        blendDst: material.blendDst,
        blendEquationAlpha: material.blendEquationAlpha,
        blendSrcAlpha: material.blendSrcAlpha,
        blendDstAlpha: material.blendDstAlpha,
        premultipliedAlpha: material.premultipliedAlpha,
        needsUpdate: material.needsUpdate,
        depthWrite: material.depthWrite,
        depthTest: material.depthTest,
      };
      this.blendFactorsMap[material.uuid] = blendState;
      material.blending = newBlendState.blending;
      material.blendEquation = newBlendState.blendEquation;
      material.blendSrc = newBlendState.blendSrc;
      material.blendDst = newBlendState.blendDst;
      material.blendEquationAlpha = newBlendState.blendEquationAlpha;
      material.blendSrcAlpha = newBlendState.blendSrcAlpha;
      material.blendDstAlpha = newBlendState.blendDstAlpha;
      material.premultipliedAlpha = newBlendState.premultipliedAlpha;
      material.depthWrite = false;
      material.depthTest = true;

      material.needsUpdate = true;
    }
  },

  restoreBlendState: function(transparentList) {
    for (var i = 0, l = transparentList.length; i < l; i++) {
      var renderItem = transparentList[i];
      var material = renderItem.material;
      var originalBlendState = this.blendFactorsMap[material.uuid];
      material.blending = originalBlendState.blending;
      material.blendEquation = originalBlendState.blendEquation;
      material.blendSrc = originalBlendState.blendSrc;
      material.blendDst = originalBlendState.blendDst;
      material.blendEquationAlpha = originalBlendState.blendEquationAlpha;
      material.blendSrcAlpha = originalBlendState.blendSrcAlpha;
      material.blendDstAlpha = originalBlendState.blendDstAlpha;
      material.premultipliedAlpha = originalBlendState.premultipliedAlpha;
      material.needsUpdate = originalBlendState.needsUpdate;
      material.depthWrite = originalBlendState.depthWrite;
      material.depthTest = originalBlendState.depthTest;
      material.needsUpdate = true;
    }
  },

  isSupport: function(renderer) {
    var extensions = renderer.extensions;
    var halfFloatFragmentTextures = !!extensions.get('OES_texture_half_float');
    var depthTextureSupport = !!extensions.get('WEBGL_depth_texture');
    if (!depthTextureSupport) {
      console.warn('OIT Needs support of Depth Texture');
      return false;
    }
    if (halfFloatFragmentTextures) {
      return true;
    } else {
      var floatFragmentTextures = !!extensions.get('OES_texture_float');
      if (floatFragmentTextures) {
        return true;
      } else {
        console.log(
          'OIT Needs either Float or Half Float texture support, using general render'
        );
        return false;
      }
    }
  },
};

// File:examples/js/postprocessing/IndexPass.js

/**
 * @author godlzr / http://godlzr.com/
 */

THREE.IndexPass = function(scene, camera, idType) {
  THREE.Pass.call(this);

  this.camera = camera;
  this.idType = idType || 'uuid';
  this.meshMatMap = {};
  this.indexColorScene = scene;
};

THREE.IndexPass.prototype = Object.assign(Object.create(THREE.Pass.prototype), {
  constructor: THREE.IndexPass,

  switchMaterial: function() {
    if (this.indexColorScene) {
      var idType = this.idType;
      var self = this;

      this.indexColorScene.traverse(function(object) {
        if (object.type === 'Mesh') {
          if (object[idType]) {
            if (self.meshMatMap[object[idType]]) {
              object.material = self.enabled
                ? self.meshMatMap[object[idType]].index
                : self.meshMatMap[object[idType]].original;
            } else {
              var map = {};

              map.original = object.material;

              var id = object[idType];
              var color = id.slice(0, 6);

              map.index = new THREE.MeshBasicMaterial({
                color: '#' + color,
                side: THREE.DoubleSide,
              });

              self.meshMatMap[id] = map;
            }
          }
        }
      });
    }
  },

  render: function(renderer, writeBuffer, readBuffer, delta, maskActive) {
    if (this.indexColorScene) {
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.gammaInput = false;
      renderer.gammaOutput = false;
      renderer.setClearColor(0xffffff, 0);
      renderer.autoClear = true;

      this.switchMaterial();

      if (this.renderToScreen) {
        renderer.render(this.indexColorScene, this.camera);
      } else {
        renderer.render(
          this.indexColorScene,
          this.camera,
          writeBuffer,
          this.clear
        );
      }
    }
  },
});

module.exports = THREE;
