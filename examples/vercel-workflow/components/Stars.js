/** @format */

import { PlasmicCanvasContext } from "@plasmicapp/host";
import { useContext, useEffect, useRef } from "react";
import * as THREE from "three";

// Port from Shadertoy to THREE.js: https://www.shadertoy.com/view/4sG3WV

const VERTEX_SHADER = `
    varying vec2 vUv;

    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
`;

const BUFFER_B_FRAG = `
    uniform vec4 iMouse;
    uniform sampler2D iChannel0;
    uniform vec3 iResolution;
    varying vec2 vUv;

    bool pixelAt(vec2 coord, float a, float b) {
        return (floor(coord.x) == a && floor(coord.y) == b);
    }

    vec4 backbuffer(float a,float b) {
      return texture2D( iChannel0, (0.5+vec2(a,b)) / iResolution.xy, -100.0 );
    }

    void main( ) {

        // vec2 uv = vUv;// / iResolution.xy;
        // vec4 color = texture2D(iChannel0,uv);

        // if (pixelAt(gl_FragCoord.xy,0.,0.)) { //Surface position
        //     gl_FragColor = vec4(backbuffer(0.,0.).rg+(backbuffer(4.,0.).r*(backbuffer(2.,0.).rg-backbuffer(1.,0.).rg)),0.,1.);
        // } else if (pixelAt(gl_FragCoord.xy,1.,0.)) { //New mouse position
        //     gl_FragColor = vec4(iMouse.xy/iResolution.xy,0.,1.);
        // } else if (pixelAt(gl_FragCoord.xy,2.,0.)) { //Old mouse position
        //     gl_FragColor = vec4(backbuffer(1.,0.).rg,0.,1.);
        // } else if (pixelAt(gl_FragCoord.xy,3.,0.)) { //New mouse holded
        //     gl_FragColor = vec4(clamp(iMouse.z,0.,1.),0.,0.,1.);
        // } else if (pixelAt(gl_FragCoord.xy,4.,0.)) { //Old mouse holded
        //     gl_FragColor = vec4(backbuffer(3.,0.).r,0.,0.,1.);
        // } else {
        //     gl_FragColor = vec4(0.,0.,0.,1.);
        // }

    }
`;

const BUFFER_A_FRAG = `
uniform vec3      iResolution;           // viewport resolution (in pixels)
uniform float     iTime;                 // shader playback time (in seconds)
uniform float     iTimeDelta;            // render time (in seconds)
uniform int       iFrame;                // shader playback frame
uniform float     iChannelTime[4];       // channel playback time (in seconds)
uniform vec3      iChannelResolution[4]; // channel resolution (in pixels)
uniform vec4      iMouse;                // mouse pixel coords. xy: current (if MLB down), zw: click
uniform sampler2D iChannel0;          // input channel. XX = 2D/Cube
uniform vec4      iDate;                 // (year, month, day, time in seconds)
uniform float     iSampleRate;           // sound sample rate (i.e., 44100)
//
// Description : Array and textureless GLSL 2D/3D/4D simplex
//               noise functions.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//               https://github.com/stegu/webgl-noise
//
    vec3 mod289(vec3 x) {
      return x - floor(x * (1.0 / 289.0)) * 289.0;
    }

    vec4 mod289(vec4 x) {
      return x - floor(x * (1.0 / 289.0)) * 289.0;
    }

    vec4 permute(vec4 x) {
         return mod289(((x*34.0)+1.0)*x);
    }

    vec4 taylorInvSqrt(vec4 r)
    {
      return 1.79284291400159 - 0.85373472095314 * r;
    }

    float snoise(vec3 v)
      {
      const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
      vec3 i  = floor(v + dot(v, C.yyy) );
      vec3 x0 =   v - i + dot(i, C.xxx) ;

    // Other corners
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );

      //   x0 = x0 - 0.0 + 0.0 * C.xxx;
      //   x1 = x0 - i1  + 1.0 * C.xxx;
      //   x2 = x0 - i2  + 2.0 * C.xxx;
      //   x3 = x0 - 1.0 + 3.0 * C.xxx;
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
      vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

    // Permutations
      i = mod289(i);
      vec4 p = permute( permute( permute(
                 i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
               + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    // Gradients: 7x7 points over a square, mapped onto an octahedron.
    // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
      float n_ = 0.142857142857; // 1.0/7.0
      vec3  ns = n_ * D.wyz - D.xzx;

      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);

      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );

      //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
      //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));

      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);

    //Normalise gradients
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;

    // Mix final noise value
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                    dot(p2,x2), dot(p3,x3)));
	}

float tilingNoise(vec2 position, float size) {
    float value = snoise(vec3(position * size, 0.0));

    float wrapx = snoise(vec3(position * size - vec2(size, 0.0), 0.0));
    value = mix(value, wrapx, max(0.0, position.x * size - (size - 1.0)));

    float wrapy = snoise(vec3(position * size - vec2(0.0, size), 0.0));
    float wrapxy = snoise(vec3(position * size - vec2(size, size), 0.0));
    wrapy = mix(wrapy, wrapxy, max(0.0, position.x * size - (size - 1.0)));
	return mix(value, wrapy, max(0.0, position.y * size - (size - 1.0)));
}

void initialize(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    const int octaves = 6;

    float value = 0.0;
  	float maxValue = 0.0;
    for (float octave = 0.0; octave < float(octaves); octave++) {
    	value += pow(2.0, -octave) * tilingNoise(uv, 8.0 * pow(2.0, octave));
        maxValue += pow(2.0, -octave);
    }

    maxValue *= 0.5;

    fragColor = vec4(0.5 * (1.0 + value / maxValue) * vec3(1.0), 1.0);
    fragColor.g = iResolution.x;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    fragColor = texture(iChannel0, fragCoord / iResolution.xy);
    if (fragColor.g != iResolution.x) {
    	initialize(fragColor, fragCoord);
    }
}

void main( void ){
  vec4 color = vec4(0.0,0.0,0.0,1.0);
  mainImage( color, gl_FragCoord.xy );
  color.w = 1.0;
  gl_FragColor = color;
}


`;

const BUFFER_FINAL_FRAG = `
uniform vec3      iResolution;           // viewport resolution (in pixels)
uniform float     iTime;                 // shader playback time (in seconds)
uniform float     iTimeDelta;            // render time (in seconds)
uniform int       iFrame;                // shader playback frame
uniform float     iChannelTime[4];       // channel playback time (in seconds)
uniform vec3      iChannelResolution[4]; // channel resolution (in pixels)
uniform vec4      iMouse;                // mouse pixel coords. xy: current (if MLB down), zw: click
uniform sampler2D iChannel0;          // input channel. XX = 2D/Cube
uniform vec4      iDate;                 // (year, month, day, time in seconds)
uniform float     iSampleRate;           // sound sample rate (i.e., 44100)

    varying vec2 vUv;

    // void main() {
    //     vec2 uv = vUv;
    //     vec2 a = texture2D(iChannel1,uv).xy;
    //     gl_FragColor = vec4(texture2D(iChannel0,a).rgb,1.0);
    // }

    const float FLIGHT_SPEED = 8.0;

const float DRAW_DISTANCE = 60.0; // Lower this to increase framerate
const float FADEOUT_DISTANCE = 10.0; // must be < DRAW_DISTANCE
const float FIELD_OF_VIEW = 1.05;

const float STAR_SIZE = 0.2; // must be > 0 and < 1
const float STAR_CORE_SIZE = 0.14;

const float CLUSTER_SCALE = 0.02;
const float STAR_THRESHOLD = 0.775;

const float BLACK_HOLE_CORE_RADIUS = 0.2;
const float BLACK_HOLE_THRESHOLD = 0.9995;
const float BLACK_HOLE_DISTORTION = 0.03;

// http://lolengine.net/blog/2013/07/27/rgb-to-hsv-in-glsl
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// https://stackoverflow.com/questions/4200224/random-noise-functions-for-glsl
float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 getRayDirection(vec2 fragCoord, vec3 cameraDirection) {
    vec2 uv = fragCoord.xy / iResolution.xy;

    const float screenWidth = 1.0;
    float originToScreen = screenWidth / 2.0 / tan(FIELD_OF_VIEW / 2.0);

    vec3 screenCenter = originToScreen * cameraDirection;
    vec3 baseX = normalize(cross(screenCenter, vec3(0, -1.0, 0)));
    vec3 baseY = normalize(cross(screenCenter, baseX));

    return normalize(screenCenter + (uv.x - 0.5) * baseX + (uv.y - 0.5) * iResolution.y / iResolution.x * baseY);
}

float getDistance(ivec3 chunkPath, vec3 localStart, vec3 localPosition) {
    return length(vec3(chunkPath) + localPosition - localStart);
}

void move(inout vec3 localPosition, vec3 rayDirection, vec3 directionBound) {
    vec3 directionSign = sign(rayDirection);
	vec3 amountVector = (directionBound - directionSign * localPosition) / abs(rayDirection);

    float amount = min(amountVector.x, min(amountVector.y, amountVector.z));

    localPosition += amount * rayDirection;
}

// Makes sure that each component of localPosition is >= 0 and <= 1
void moveInsideBox(inout vec3 localPosition, inout ivec3 chunk, vec3 directionSign, vec3 direcctionBound) {
    const float eps = 0.0000001;
    if (localPosition.x * directionSign.x >= direcctionBound.x - eps) {
        localPosition.x -= directionSign.x;
        chunk.x += int(directionSign.x);
    } else if (localPosition.y * directionSign.y >= direcctionBound.y - eps) {
        localPosition.y -= directionSign.y;
        chunk.y += int(directionSign.y);
    } else if (localPosition.z * directionSign.z >= direcctionBound.z - eps) {
        localPosition.z -= directionSign.z;
        chunk.z += int(directionSign.z);
    }
}

bool hasStar(ivec3 chunk) {
    return texture(iChannel0, mod(CLUSTER_SCALE * (vec2(chunk.xy) + vec2(chunk.zx)) + vec2(0.724, 0.111), 1.0)).r > STAR_THRESHOLD
        && texture(iChannel0, mod(CLUSTER_SCALE * (vec2(chunk.xz) + vec2(chunk.zy)) + vec2(0.333, 0.777), 1.0)).r > STAR_THRESHOLD;
}

bool hasBlackHole(ivec3 chunk) {
    return rand(0.0001 * vec2(chunk.xy) + 0.002 * vec2(chunk.yz)) > BLACK_HOLE_THRESHOLD;
}

vec3 getStarToRayVector(vec3 rayBase, vec3 rayDirection, vec3 starPosition) {
	float r = (dot(rayDirection, starPosition) - dot(rayDirection, rayBase)) / dot(rayDirection, rayDirection);
    vec3 pointOnRay = rayBase + r * rayDirection;
    return pointOnRay - starPosition;
}

vec3 getStarPosition(ivec3 chunk, float starSize) {
    vec3 position = abs(vec3(rand(vec2(float(chunk.x) / float(chunk.y) + 0.24, float(chunk.y) / float(chunk.z) + 0.66)),
                             rand(vec2(float(chunk.x) / float(chunk.z) + 0.73, float(chunk.z) / float(chunk.y) + 0.45)),
                             rand(vec2(float(chunk.y) / float(chunk.x) + 0.12, float(chunk.y) / float(chunk.z) + 0.76))));

    return starSize * vec3(1.0) + (1.0 - 2.0 * starSize) * position;
}

vec4 getNebulaColor(vec3 globalPosition, vec3 rayDirection) {
    vec3 color = vec3(0.0);
    float spaceLeft = 1.0;

    const float layerDistance = 10.0;
    float rayLayerStep = rayDirection.z / layerDistance;

    const int steps = 4;
    for (int i = 0; i <= steps; i++) {
    	vec3 noiseeval = globalPosition + rayDirection * ((1.0 - fract(globalPosition.z / layerDistance) + float(i)) * layerDistance / rayDirection.z);
    	noiseeval.xy += noiseeval.z;


        float value = 0.06 * texture(iChannel0, fract(noiseeval.xy / 60.0)).r;

        if (i == 0) {
            value *= 1.0 - fract(globalPosition.z / layerDistance);
        } else if (i == steps) {
            value *= fract(globalPosition.z / layerDistance);
        }

        float hue = mod(noiseeval.z / layerDistance / 34.444, 1.0);

        color += spaceLeft * hsv2rgb(vec3(hue, 1.0, value));
        spaceLeft = max(0.0, spaceLeft - value * 2.0);
    }
    return vec4(color, 1.0);
}

vec4 getStarGlowColor(float starDistance, float angle, float hue) {
    float progress = 1.0 - starDistance;
    return vec4(hsv2rgb(vec3(hue, 0.3, 1.0)), 0.4 * pow(progress, 2.0) * mix(pow(abs(sin(angle * 2.5)), 8.0), 1.0, progress));
}

float atan2(vec2 value) {
    if (value.x > 0.0) {
        return atan(value.y / value.x);
    } else if (value.x == 0.0) {
    	return 3.14592 * 0.5 * sign(value.y);
    } else if (value.y >= 0.0) {
        return atan(value.y / value.x) + 3.141592;
    } else {
        return atan(value.y / value.x) - 3.141592;
    }
}

vec3 getStarColor(vec3 starSurfaceLocation, float seed, float viewDistance) {
    const float DISTANCE_FAR = 20.0;
    const float DISTANCE_NEAR = 15.0;

    if (viewDistance > DISTANCE_FAR) {
    	return vec3(1.0);
    }

    float fadeToWhite = max(0.0, (viewDistance - DISTANCE_NEAR) / (DISTANCE_FAR - DISTANCE_NEAR));

    vec3 coordinate = vec3(acos(starSurfaceLocation.y), atan2(starSurfaceLocation.xz), seed);

    float progress = pow(texture(iChannel0, fract(0.3 * coordinate.xy + seed * vec2(1.1))).r, 4.0);

    return mix(mix(vec3(1.0, 0.98, 0.9), vec3(1.0, 0.627, 0.01), progress), vec3(1.0), fadeToWhite);
}

vec4 blendColors(vec4 front, vec4 back) {
  	return vec4(mix(back.rgb, front.rgb, front.a / (front.a + back.a)), front.a + back.a - front.a * back.a);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec3 movementDirection = normalize(vec3(0.01, 0.0, 1.0));

    vec3 rayDirection = getRayDirection(fragCoord, movementDirection);
    vec3 directionSign = sign(rayDirection);
    vec3 directionBound = vec3(0.5) + 0.5 * directionSign;

    vec3 globalPosition = vec3(3.14159, 3.14159, 0.0) + (iTime + 1000.0) * FLIGHT_SPEED * movementDirection;
    ivec3 chunk = ivec3(globalPosition);
    vec3 localPosition = mod(globalPosition, 1.0);
    moveInsideBox(localPosition, chunk, directionSign, directionBound);

    ivec3 startChunk = chunk;
    vec3 localStart = localPosition;

    fragColor = vec4(0.0);


    for (int i = 0; i < 50; i++) {
        move(localPosition, rayDirection, directionBound);
        moveInsideBox(localPosition, chunk, directionSign, directionBound);

        if (hasStar(chunk)) {
            vec3 starPosition = getStarPosition(chunk, 0.5 * STAR_SIZE);
			float currentDistance = getDistance(chunk - startChunk, localStart, starPosition);
            if (currentDistance > DRAW_DISTANCE && false) {
                break;
            }

            // This vector points from the center of the star to the closest point on the ray (orthogonal to the ray)
            vec3 starToRayVector = getStarToRayVector(localPosition, rayDirection, starPosition);
            // Distance between ray and star
            float distanceToStar = length(starToRayVector);
            distanceToStar *= 2.0;

            if (distanceToStar < STAR_SIZE) {
                float starMaxBrightness = clamp((DRAW_DISTANCE - currentDistance) / FADEOUT_DISTANCE, 0.001, 1.0);

                float starColorSeed = (float(chunk.x) + 13.0 * float(chunk.y) + 7.0 * float(chunk.z)) * 0.00453;
                if (distanceToStar < STAR_SIZE * STAR_CORE_SIZE) {
                    // This vector points from the center of the star to the point of the star sphere surface that this ray hits
            		vec3 starSurfaceVector = normalize(starToRayVector + rayDirection * sqrt(pow(STAR_CORE_SIZE * STAR_SIZE, 2.0) - pow(distanceToStar, 2.0)));

                    fragColor = blendColors(fragColor, vec4(getStarColor(starSurfaceVector, starColorSeed, currentDistance), starMaxBrightness));
                    break;
                } else {
                    float localStarDistance = ((distanceToStar / STAR_SIZE) - STAR_CORE_SIZE) / (1.0 - STAR_CORE_SIZE);
                    vec4 glowColor = getStarGlowColor(localStarDistance, atan2(starToRayVector.xy), starColorSeed);
                    glowColor.a *= starMaxBrightness;
                	fragColor = blendColors(fragColor, glowColor);
                }
            }
        } else if (hasBlackHole(chunk)) {
            const vec3 blackHolePosition = vec3(0.5);
			float currentDistance = getDistance(chunk - startChunk, localStart, blackHolePosition);
            float fadeout = min(1.0, (DRAW_DISTANCE - currentDistance) / FADEOUT_DISTANCE);

            // This vector points from the center of the black hole to the closest point on the ray (orthogonal to the ray)
            vec3 coreToRayVector = getStarToRayVector(localPosition, rayDirection, blackHolePosition);
            float distanceToCore = length(coreToRayVector);
            if (distanceToCore < BLACK_HOLE_CORE_RADIUS * 0.5) {
                fragColor = blendColors(fragColor, vec4(vec3(0.0), fadeout));
                break;
            } else if (distanceToCore < 0.5) {
            	rayDirection = normalize(rayDirection - fadeout * (BLACK_HOLE_DISTORTION / distanceToCore - BLACK_HOLE_DISTORTION / 0.5) * coreToRayVector / distanceToCore);
            }
        }

        if (length(vec3(chunk - startChunk)) > DRAW_DISTANCE) {
            break;
        }
    }

    if (fragColor.a < 1.0) {
    	fragColor = blendColors(fragColor, getNebulaColor(globalPosition, rayDirection));
    }
}

    void main( void ){
      vec4 color = vec4(0.0,0.0,0.0,1.0);
      mainImage( color, gl_FragCoord.xy );
      color.w = 1.0;
      gl_FragColor = color;
    }

`;

const startTime = +new Date();

class App {
  constructor(container) {
    this.width = 1024;
    this.height = 512;

    this.renderer = new THREE.WebGLRenderer();
    this.loader = new THREE.TextureLoader();
    this.mousePosition = new THREE.Vector4();
    // this.itime = new THREE.Vector1();
    this.orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.counter = 0;

    this.renderer.setSize(this.width, this.height);
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";

    this.renderer.domElement.addEventListener("mousedown", () => {
      this.mousePosition.setZ(1);
      this.counter = 0;
    });

    this.renderer.domElement.addEventListener("mouseup", () => {
      this.mousePosition.setZ(0);
    });

    this.renderer.domElement.addEventListener("mousemove", (event) => {
      this.mousePosition.setX(event.clientX);
      this.mousePosition.setY(this.height - event.clientY);
    });

    this.targetA = new BufferManager(this.renderer, {
      width: this.width,
      height: this.height,
    });
    this.targetB = new BufferManager(this.renderer, {
      width: this.width,
      height: this.height,
    });
    this.targetC = new BufferManager(this.renderer, {
      width: this.width,
      height: this.height,
    });
    this.scrollTop = 0;
  }

  start() {
    const resolution = new THREE.Vector3(
      this.width,
      this.height,
      window.devicePixelRatio
    );
    const channel0 = this.loader.load(
      "https://res.cloudinary.com/di4jisedp/image/upload/v1523722553/wallpaper.jpg"
    );
    this.loader.setCrossOrigin("");

    this.bufferA = new BufferShader(BUFFER_A_FRAG, {
      iFrame: {
        value: 0,
      },
      iResolution: {
        value: resolution,
      },
      iMouse: {
        value: this.mousePosition,
      },
      iChannel0: {
        value: null,
      },
      iChannel1: {
        value: null,
      },
    });

    this.bufferB = new BufferShader(BUFFER_B_FRAG, {
      iFrame: {
        value: 0,
      },
      iResolution: {
        value: resolution,
      },
      iMouse: {
        value: this.mousePosition,
      },
      iChannel0: {
        value: null,
      },
    });

    this.bufferImage = new BufferShader(BUFFER_FINAL_FRAG, {
      iResolution: {
        value: resolution,
      },
      iMouse: {
        value: this.mousePosition,
      },
      iChannel0: {
        value: channel0,
      },
      iChannel1: {
        value: null,
      },
      iTime: {
        value: 0.0,
      },
      speed: {
        value: 8,
      },
    });

    this.animate();
  }

  resizeCanvasToDisplaySize() {
    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== this.width || canvas.height !== height) {
      // you must pass false here or three.js sadly fights the browser
      this.renderer.setSize(width, height, false);
      // camera.aspect = width / height;
      // camera.updateProjectionMatrix();

      // set render target sizes here
    }
  }

  animate() {
    requestAnimationFrame(() => {
      this.resizeCanvasToDisplaySize();

      this.bufferA.uniforms["iFrame"].value = this.counter++;

      this.bufferA.uniforms[
        "iChannel0"
      ].value = this.targetA.readBuffer.texture;
      this.bufferA.uniforms[
        "iChannel1"
      ].value = this.targetB.readBuffer.texture;
      this.targetA.render(this.bufferA.scene, this.orthoCamera);

      this.bufferB.uniforms[
        "iChannel0"
      ].value = this.targetB.readBuffer.texture;
      this.targetB.render(this.bufferB.scene, this.orthoCamera);

      this.bufferImage.uniforms[
        "iChannel0"
      ].value = this.targetA.readBuffer.texture;

      // We distort the time on the final texture based on the scroll position.
      // We smooth out the scroll position using an EWMA with alpha = 0.2 (just based on what looked good), assuming 60fps (16.667 ms per frame).
      // Also must scale down the scroll position to the expected unit scale of the starfield speed (resting is 8.0).

      const currentTime = +new Date();
      const elapsed = currentTime - (this.lastTime ?? startTime);
      this.lastTime = currentTime;

      const alpha = 0.02 * (elapsed / 16.666667);
      this.ewma =
        (alpha * getScrollTop()) / 100 + (this.ewma ?? 0) * (1.0 - alpha);

      this.bufferImage.uniforms["iTime"].value =
        (+new Date() - startTime) / 1000 + this.ewma;
      this.targetC.render(this.bufferImage.scene, this.orthoCamera, true);

      this.animate();
    });
  }
}

class BufferShader {
  constructor(fragmentShader, uniforms = {}) {
    this.uniforms = uniforms;
    this.material = new THREE.ShaderMaterial({
      fragmentShader: fragmentShader,
      vertexShader: VERTEX_SHADER,
      uniforms: uniforms,
    });
    this.scene = new THREE.Scene();
    this.scene.add(
      new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), this.material)
    );
  }
}

class BufferManager {
  constructor(renderer, size) {
    this.renderer = renderer;

    this.readBuffer = new THREE.WebGLRenderTarget(size.width, size.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      stencilBuffer: false,
    });

    this.writeBuffer = this.readBuffer.clone();
  }

  swap() {
    const temp = this.readBuffer;
    this.readBuffer = this.writeBuffer;
    this.writeBuffer = temp;
  }

  render(scene, camera, toScreen = false) {
    if (toScreen) {
      this.renderer.render(scene, camera);
    } else {
      this.renderer.setRenderTarget(this.writeBuffer);
      this.renderer.clear();
      this.renderer.render(scene, camera);
      this.renderer.setRenderTarget(null);
    }
    this.swap();
  }
}

function getScrollTop() {
  const scrollTop =
    window.pageYOffset !== undefined
      ? window.pageYOffset
      : (document.documentElement || document.body.parentNode || document.body)
          .scrollTop;
  return scrollTop;
}

export default function Stars({ className }) {
  const ref = useRef(null);
  const inEditor = useContext(PlasmicCanvasContext);
  useEffect(() => {
    if (!inEditor) {
      const app = new App(ref.current);
      app.start();
    }
  }, []);
  return <div className={className} ref={ref}></div>;
}
