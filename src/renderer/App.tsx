/* eslint-disable no-undef */
/* eslint-disable react/no-unknown-property */
import { OrbitControls, useGLTF, Preload, Stats } from '@react-three/drei';
import { Canvas, ThreeEvent, useFrame } from '@react-three/fiber';
import { Suspense, useMemo, useRef, useState } from 'react';
import { Perf } from 'r3f-perf';
import {
  Mesh,
  MeshStandardMaterial,
  Group,
  Vector3,
  MathUtils,
  ShaderMaterial,
} from 'three';
import { GLTF } from 'three-stdlib';
import highPollyHeadphone from '../../headphones_high_polly.glb';
// vertex shader
const vertexShader3 = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;
// darker fragment with transparency
const fragmentShader6 = `
uniform sampler2D uTexture;
uniform vec3 uColor;
uniform float uRoughness;
uniform float uMetalness;
uniform vec3 uAmbientLight;
uniform vec3 uSpotLightColor1;
uniform vec3 uSpotLightColor2;
uniform vec3 uSpotLightPosition1;
uniform vec3 uSpotLightPosition2;
uniform vec3 uSpotLightDirection1;
uniform vec3 uSpotLightDirection2;
uniform float uSpotLightCutoff1;
uniform float uSpotLightCutoff2;
uniform float pixelSize;
uniform bool uHovered;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

const float bayerMatrix[64] = float[64](
    0.0 / 64.0, 32.0 / 64.0, 8.0 / 64.0, 40.0 / 64.0, 2.0 / 64.0, 34.0 / 64.0, 10.0 / 64.0, 42.0 / 64.0,
    48.0 / 64.0, 16.0 / 64.0, 56.0 / 64.0, 24.0 / 64.0, 50.0 / 64.0, 18.0 / 64.0, 58.0 / 64.0, 26.0 / 64.0,
    12.0 / 64.0, 44.0 / 64.0, 4.0 / 64.0, 36.0 / 64.0, 14.0 / 64.0, 46.0 / 64.0, 6.0 / 64.0, 38.0 / 64.0,
    60.0 / 64.0, 28.0 / 64.0, 52.0 / 64.0, 20.0 / 64.0, 62.0 / 64.0, 30.0 / 64.0, 54.0 / 64.0, 22.0 / 64.0,
    3.0 / 64.0, 35.0 / 64.0, 11.0 / 64.0, 43.0 / 64.0, 1.0 / 64.0, 33.0 / 64.0, 9.0 / 64.0, 41.0 / 64.0,
    51.0 / 64.0, 19.0 / 64.0, 59.0 / 64.0, 27.0 / 64.0, 49.0 / 64.0, 17.0 / 64.0, 57.0 / 64.0, 25.0 / 64.0,
    15.0 / 64.0, 47.0 / 64.0, 7.0 / 64.0, 39.0 / 64.0, 13.0 / 64.0, 45.0 / 64.0, 5.0 / 64.0, 37.0 / 64.0,
    63.0 / 64.0, 31.0 / 64.0, 55.0 / 64.0, 23.0 / 64.0, 61.0 / 64.0, 29.0 / 64.0, 53.0 / 64.0, 21.0 / 64.0
);

void main() {
  vec2 uv = vUv;

  // Pixelation effect
  uv = floor(uv * pixelSize) / pixelSize;

  vec4 baseColor = texture2D(uTexture, uv) * vec4(uColor, 1.0);

  // Calculate lighting
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);

  // SpotLight 1
  vec3 lightDir1 = normalize(uSpotLightPosition1 - vViewPosition);
  float theta1 = dot(lightDir1, normalize(-uSpotLightDirection1));
  float intensity1 = clamp((theta1 - uSpotLightCutoff1) / (1.0 - uSpotLightCutoff1), 0.0, 1.0);
  float diff1 = max(dot(normal, lightDir1), 0.0) * intensity1;
  vec3 halfwayDir1 = normalize(lightDir1 + viewDir);
  float spec1 = pow(max(dot(normal, halfwayDir1), 0.0), 16.0) * uMetalness * intensity1;
  vec3 spotLightEffect1 = uSpotLightColor1 * (diff1 + spec1);

  // SpotLight 2
  vec3 lightDir2 = normalize(uSpotLightPosition2 - vViewPosition);
  float theta2 = dot(lightDir2, normalize(-uSpotLightDirection2));
  float intensity2 = clamp((theta2 - uSpotLightCutoff2) / (1.0 - uSpotLightCutoff2), 0.0, 1.0);
  float diff2 = max(dot(normal, lightDir2), 0.0) * intensity2;
  vec3 halfwayDir2 = normalize(lightDir2 + viewDir);
  float spec2 = pow(max(dot(normal, halfwayDir2), 0.0), 16.0) * uMetalness * intensity2;
  vec3 spotLightEffect2 = uSpotLightColor2 * (diff2 + spec2);

  // Combine lighting effects
  vec3 color = baseColor.rgb * (spotLightEffect1 + spotLightEffect2 + uAmbientLight);

  // Convert color to grayscale
  float gray = dot(color, vec3(0.299, 0.587, 0.114));

  // Apply Bayer matrix for dithering
  vec2 coord = mod(gl_FragCoord.xy, 8.0);
  int index = int(coord.y) * 8 + int(coord.x);
  float threshold = bayerMatrix[index];

  // Adjust threshold based on grayscale value for gradual discard
  if (gray < threshold * 0.75) {
    discard; // Make the fragment invisible if it is closer to black
  }

  // Set color based on hover state using a ternary operator
  //float outputColor = gray > threshold ? 1.0 : 0.0;
  //float outputFactor = clamp(outputColor, 0.0, 1.0);

  //vec3 finalColor = uHovered ? mix(vec3(0.0, 1.0, 0.0), vec3(0.0, 0.0, 1.0), outputFactor) : vec3(1.0);
  //vec3 finalColor = uHovered ? mix(vec3(0.0, 1.0, 0.0), vec3(0.0, 0.0, 1.0), outputColor) : vec3(1.0);

  //gl_FragColor = vec4(finalColor, 1.0);
  if (uHovered) {
    float outputColor = gray > threshold ? 1.0 : 0.0;
    vec3 hoverColor = mix(vec3(0.0, 1.0, 0.0), vec3(0.0, 0.0, 1.0), outputColor); // Green to Blue
    gl_FragColor = vec4(hoverColor, 1.0);
  } else {
    gl_FragColor = vec4(vec3(1.0), 1.0);
  }
}
`;
// whiter fragment with transparency
const fragmentShader7 = `
    uniform sampler2D uTexture;
  uniform vec3 uColor;
  uniform float uRoughness;
  uniform float uMetalness;
  uniform vec3 uAmbientLight;
  uniform vec3 uSpotLightColor1;
  uniform vec3 uSpotLightColor2;
  uniform vec3 uSpotLightPosition1;
  uniform vec3 uSpotLightPosition2;
  uniform vec3 uSpotLightDirection1;
  uniform vec3 uSpotLightDirection2;
  uniform float uSpotLightCutoff1;
  uniform float uSpotLightCutoff2;
  uniform float pixelSize;
  uniform bool uHovered;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  const float bayerMatrix[64] = float[64](
      0.0 / 64.0, 32.0 / 64.0, 8.0 / 64.0, 40.0 / 64.0, 2.0 / 64.0, 34.0 / 64.0, 10.0 / 64.0, 42.0 / 64.0,
      48.0 / 64.0, 16.0 / 64.0, 56.0 / 64.0, 24.0 / 64.0, 50.0 / 64.0, 18.0 / 64.0, 58.0 / 64.0, 26.0 / 64.0,
      12.0 / 64.0, 44.0 / 64.0, 4.0 / 64.0, 36.0 / 64.0, 14.0 / 64.0, 46.0 / 64.0, 6.0 / 64.0, 38.0 / 64.0,
      60.0 / 64.0, 28.0 / 64.0, 52.0 / 64.0, 20.0 / 64.0, 62.0 / 64.0, 30.0 / 64.0, 54.0 / 64.0, 22.0 / 64.0,
      3.0 / 64.0, 35.0 / 64.0, 11.0 / 64.0, 43.0 / 64.0, 1.0 / 64.0, 33.0 / 64.0, 9.0 / 64.0, 41.0 / 64.0,
      51.0 / 64.0, 19.0 / 64.0, 59.0 / 64.0, 27.0 / 64.0, 49.0 / 64.0, 17.0 / 64.0, 57.0 / 64.0, 25.0 / 64.0,
      15.0 / 64.0, 47.0 / 64.0, 7.0 / 64.0, 39.0 / 64.0, 13.0 / 64.0, 45.0 / 64.0, 5.0 / 64.0, 37.0 / 64.0,
      63.0 / 64.0, 31.0 / 64.0, 55.0 / 64.0, 23.0 / 64.0, 61.0 / 64.0, 29.0 / 64.0, 53.0 / 64.0, 21.0 / 64.0
  );

  void main() {
    vec2 uv = vUv;

    // Pixelation effect
    uv = floor(uv * pixelSize) / pixelSize;

    vec4 baseColor = texture2D(uTexture, uv) * vec4(uColor, 1.0);

    // Calculate lighting
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);

    // SpotLight 1
    vec3 lightDir1 = normalize(uSpotLightPosition1 - vViewPosition);
    float theta1 = dot(lightDir1, normalize(-uSpotLightDirection1));
    float intensity1 = clamp((theta1 - uSpotLightCutoff1) / (1.0 - uSpotLightCutoff1), 0.0, 1.0);
    float diff1 = max(dot(normal, lightDir1), 0.0) * intensity1;
    vec3 halfwayDir1 = normalize(lightDir1 + viewDir);
    float spec1 = pow(max(dot(normal, halfwayDir1), 0.0), 16.0) * uMetalness * intensity1;
    vec3 spotLightEffect1 = uSpotLightColor1 * (diff1 + spec1);

    // SpotLight 2
    vec3 lightDir2 = normalize(uSpotLightPosition2 - vViewPosition);
    float theta2 = dot(lightDir2, normalize(-uSpotLightDirection2));
    float intensity2 = clamp((theta2 - uSpotLightCutoff2) / (1.0 - uSpotLightCutoff2), 0.0, 1.0);
    float diff2 = max(dot(normal, lightDir2), 0.0) * intensity2;
    vec3 halfwayDir2 = normalize(lightDir2 + viewDir);
    float spec2 = pow(max(dot(normal, halfwayDir2), 0.0), 16.0) * uMetalness * intensity2;
    vec3 spotLightEffect2 = uSpotLightColor2 * (diff2 + spec2);

    // Combine lighting effects
    vec3 color = baseColor.rgb * (spotLightEffect1 + spotLightEffect2 + uAmbientLight);

    // Convert color to grayscale
    float gray = dot(color, vec3(0.299, 0.587, 0.114));

    // Apply Bayer matrix for dithering
    vec2 coord = mod(gl_FragCoord.xy, 8.0);
    int index = int(coord.y) * 8 + int(coord.x);
    float threshold = bayerMatrix[index];

    // Adjust threshold based on grayscale value for gradual discard
    // Scale gray value to range from white to gray (instead of black)
    float scaledGray = mix(0.10, 1.0, gray);

    if (scaledGray < threshold) {
      discard; // Make the fragment invisible if it is closer to gray
    }

    // Set color based on hover state
    if (uHovered) {
      float outputColor = gray > threshold ? 1.0 : 0.0;
      vec3 hoverColor = mix(vec3(0.0, 1.0, 0.0), vec3(0.0, 0.0, 1.0), outputColor); // Green to Blue
      gl_FragColor = vec4(hoverColor, 1.0);
    } else {
      gl_FragColor = vec4(vec3(1.0), 1.0);
    }
  }
  `;
// darker fragment without transparency
const fragmentShader8 = `
  uniform sampler2D uTexture;
uniform vec3 uColor;
uniform float uRoughness;
uniform float uMetalness;
uniform vec3 uAmbientLight;
uniform vec3 uSpotLightColor1;
uniform vec3 uSpotLightColor2;
uniform vec3 uSpotLightPosition1;
uniform vec3 uSpotLightPosition2;
uniform vec3 uSpotLightDirection1;
uniform vec3 uSpotLightDirection2;
uniform float uSpotLightCutoff1;
uniform float uSpotLightCutoff2;
uniform float pixelSize;
uniform bool uHovered;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

const float bayerMatrix[64] = float[64](
    0.0 / 64.0, 32.0 / 64.0, 8.0 / 64.0, 40.0 / 64.0, 2.0 / 64.0, 34.0 / 64.0, 10.0 / 64.0, 42.0 / 64.0,
    48.0 / 64.0, 16.0 / 64.0, 56.0 / 64.0, 24.0 / 64.0, 50.0 / 64.0, 18.0 / 64.0, 58.0 / 64.0, 26.0 / 64.0,
    12.0 / 64.0, 44.0 / 64.0, 4.0 / 64.0, 36.0 / 64.0, 14.0 / 64.0, 46.0 / 64.0, 6.0 / 64.0, 38.0 / 64.0,
    60.0 / 64.0, 28.0 / 64.0, 52.0 / 64.0, 20.0 / 64.0, 62.0 / 64.0, 30.0 / 64.0, 54.0 / 64.0, 22.0 / 64.0,
    3.0 / 64.0, 35.0 / 64.0, 11.0 / 64.0, 43.0 / 64.0, 1.0 / 64.0, 33.0 / 64.0, 9.0 / 64.0, 41.0 / 64.0,
    51.0 / 64.0, 19.0 / 64.0, 59.0 / 64.0, 27.0 / 64.0, 49.0 / 64.0, 17.0 / 64.0, 57.0 / 64.0, 25.0 / 64.0,
    15.0 / 64.0, 47.0 / 64.0, 7.0 / 64.0, 39.0 / 64.0, 13.0 / 64.0, 45.0 / 64.0, 5.0 / 64.0, 37.0 / 64.0,
    63.0 / 64.0, 31.0 / 64.0, 55.0 / 64.0, 23.0 / 64.0, 61.0 / 64.0, 29.0 / 64.0, 53.0 / 64.0, 21.0 / 64.0
);

void main() {
  vec2 uv = vUv;

  // Pixelation effect
  uv = floor(uv * pixelSize) / pixelSize;

  vec4 baseColor = texture2D(uTexture, uv) * vec4(uColor, 1.0);

  // Calculate lighting
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);

  // SpotLight 1
  vec3 lightDir1 = normalize(uSpotLightPosition1 - vViewPosition);
  float theta1 = dot(lightDir1, normalize(-uSpotLightDirection1));
  float intensity1 = clamp((theta1 - uSpotLightCutoff1) / (1.0 - uSpotLightCutoff1), 0.0, 1.0);
  float diff1 = max(dot(normal, lightDir1), 0.0) * intensity1;
  vec3 halfwayDir1 = normalize(lightDir1 + viewDir);
  float spec1 = pow(max(dot(normal, halfwayDir1), 0.0), 16.0) * uMetalness * intensity1;
  vec3 spotLightEffect1 = uSpotLightColor1 * (diff1 + spec1);

  // SpotLight 2
  vec3 lightDir2 = normalize(uSpotLightPosition2 - vViewPosition);
  float theta2 = dot(lightDir2, normalize(-uSpotLightDirection2));
  float intensity2 = clamp((theta2 - uSpotLightCutoff2) / (1.0 - uSpotLightCutoff2), 0.0, 1.0);
  float diff2 = max(dot(normal, lightDir2), 0.0) * intensity2;
  vec3 halfwayDir2 = normalize(lightDir2 + viewDir);
  float spec2 = pow(max(dot(normal, halfwayDir2), 0.0), 16.0) * uMetalness * intensity2;
  vec3 spotLightEffect2 = uSpotLightColor2 * (diff2 + spec2);

  // Combine lighting effects
  vec3 color = baseColor.rgb * (spotLightEffect1 + spotLightEffect2 + uAmbientLight);

  // Convert color to grayscale
  float gray = dot(color, vec3(0.299, 0.587, 0.114));

  // Apply Bayer matrix for dithering
  vec2 coord = mod(gl_FragCoord.xy, 8.0);
  int index = int(coord.y) * 8 + int(coord.x);
  float threshold = bayerMatrix[index];

  // Adjust color based on grayscale value and Bayer matrix threshold
  float outputColor = gray > threshold ? 1.0 : 0.0;

  // Set color based on hover state using a ternary operator
  if (uHovered) {
    vec3 hoverColor = mix(vec3(0.0, 1.0, 0.0), vec3(0.0, 0.0, 1.0), outputColor); // Green to Blue
    gl_FragColor = vec4(hoverColor, 1.0);
  } else {
    vec3 finalColor = mix(vec3(0.0), vec3(1.0), outputColor); // Black to White
    gl_FragColor = vec4(finalColor, 1.0);
  }
}
`;
// whiter fragments without transparency
const fragmentShader9 = `
uniform sampler2D uTexture;
uniform vec3 uColor;
uniform float uRoughness;
uniform float uMetalness;
uniform vec3 uAmbientLight;
uniform vec3 uSpotLightColor1;
uniform vec3 uSpotLightColor2;
uniform vec3 uSpotLightPosition1;
uniform vec3 uSpotLightPosition2;
uniform vec3 uSpotLightDirection1;
uniform vec3 uSpotLightDirection2;
uniform float uSpotLightCutoff1;
uniform float uSpotLightCutoff2;
uniform float pixelSize;
uniform bool uHovered;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

const float bayerMatrix[64] = float[64](
    0.0 / 64.0, 32.0 / 64.0, 8.0 / 64.0, 40.0 / 64.0, 2.0 / 64.0, 34.0 / 64.0, 10.0 / 64.0, 42.0 / 64.0,
    48.0 / 64.0, 16.0 / 64.0, 56.0 / 64.0, 24.0 / 64.0, 50.0 / 64.0, 18.0 / 64.0, 58.0 / 64.0, 26.0 / 64.0,
    12.0 / 64.0, 44.0 / 64.0, 4.0 / 64.0, 36.0 / 64.0, 14.0 / 64.0, 46.0 / 64.0, 6.0 / 64.0, 38.0 / 64.0,
    60.0 / 64.0, 28.0 / 64.0, 52.0 / 64.0, 20.0 / 64.0, 62.0 / 64.0, 30.0 / 64.0, 54.0 / 64.0, 22.0 / 64.0,
    3.0 / 64.0, 35.0 / 64.0, 11.0 / 64.0, 43.0 / 64.0, 1.0 / 64.0, 33.0 / 64.0, 9.0 / 64.0, 41.0 / 64.0,
    51.0 / 64.0, 19.0 / 64.0, 59.0 / 64.0, 27.0 / 64.0, 49.0 / 64.0, 17.0 / 64.0, 57.0 / 64.0, 25.0 / 64.0,
    15.0 / 64.0, 47.0 / 64.0, 7.0 / 64.0, 39.0 / 64.0, 13.0 / 64.0, 45.0 / 64.0, 5.0 / 64.0, 37.0 / 64.0,
    63.0 / 64.0, 31.0 / 64.0, 55.0 / 64.0, 23.0 / 64.0, 61.0 / 64.0, 29.0 / 64.0, 53.0 / 64.0, 21.0 / 64.0
);

void main() {
    vec2 uv = vUv;

    // Pixelation effect
    uv = floor(uv * pixelSize) / pixelSize;

    vec4 baseColor = texture2D(uTexture, uv) * vec4(uColor, 1.0);

    // Calculate lighting
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);

    // SpotLight 1
    vec3 lightDir1 = normalize(uSpotLightPosition1 - vViewPosition);
    float theta1 = dot(lightDir1, normalize(-uSpotLightDirection1));
    float intensity1 = clamp((theta1 - uSpotLightCutoff1) / (1.0 - uSpotLightCutoff1), 0.0, 1.0);
    float diff1 = max(dot(normal, lightDir1), 0.0) * intensity1;
    vec3 halfwayDir1 = normalize(lightDir1 + viewDir);
    float spec1 = pow(max(dot(normal, halfwayDir1), 0.0), 16.0) * uMetalness * intensity1;
    vec3 spotLightEffect1 = uSpotLightColor1 * (diff1 + spec1);

    // SpotLight 2
    vec3 lightDir2 = normalize(uSpotLightPosition2 - vViewPosition);
    float theta2 = dot(lightDir2, normalize(-uSpotLightDirection2));
    float intensity2 = clamp((theta2 - uSpotLightCutoff2) / (1.0 - uSpotLightCutoff2), 0.0, 1.0);
    float diff2 = max(dot(normal, lightDir2), 0.0) * intensity2;
    vec3 halfwayDir2 = normalize(lightDir2 + viewDir);
    float spec2 = pow(max(dot(normal, halfwayDir2), 0.0), 16.0) * uMetalness * intensity2;
    vec3 spotLightEffect2 = uSpotLightColor2 * (diff2 + spec2);

    // Combine lighting effects
    vec3 color = baseColor.rgb * (spotLightEffect1 + spotLightEffect2 + uAmbientLight);

    // Convert color to grayscale
    float gray = dot(color, vec3(0.299, 0.587, 0.114));

    // Scale gray value to range from white to gray (instead of black)
    float scaledGray = mix(0.10, 1.0, gray);

    // Apply Bayer matrix for dithering
    vec2 coord = mod(gl_FragCoord.xy, 8.0);
    int index = int(coord.y) * 8 + int(coord.x);
    float threshold = bayerMatrix[index];

    // Adjust color based on scaled grayscale value and Bayer matrix threshold
    float outputColor = scaledGray > threshold ? 1.0 : 0.0;

    // Set color based on hover state
    if (uHovered) {
        vec3 hoverColor = mix(vec3(0.0, 1.0, 0.0), vec3(0.0, 0.0, 1.0), outputColor); // Green to Blue
        gl_FragColor = vec4(hoverColor, 1.0);
    } else {
        vec3 finalColor = mix(vec3(0.0), vec3(1.0), outputColor); // Black to White
        gl_FragColor = vec4(finalColor, 1.0);
    }
}
`;
type HeadphonesGLTFResult = GLTF & {
  nodes: {
    Object_4: Mesh;
    Object_6: Mesh;
    Object_7: Mesh;
    Object_8: Mesh;
    Object_9: Mesh;
    Object_10: Mesh;
    Object_12: Mesh;
    Object_14: Mesh;
    Object_16: Mesh;
    Object_18: Mesh;
    Object_20: Mesh;
    Object_21: Mesh;
    Object_23: Mesh;
    Object_25: Mesh;
  };
  materials: {
    FRONT_MAT: MeshStandardMaterial;
    SIDE_MAT: MeshStandardMaterial;
    black_leather: MeshStandardMaterial;
    brushed_steel: MeshStandardMaterial;
    inside: MeshStandardMaterial;
    leather_top: MeshStandardMaterial;
    side_logo: MeshStandardMaterial;
  };
};
interface Model2Props {
  handleHovered: (isHovered: boolean, event?: ThreeEvent<PointerEvent>) => void;
  hovered: boolean;
}
export function Model2({ handleHovered, hovered }: Model2Props) {
  const { nodes, materials } = useGLTF(
    highPollyHeadphone,
  ) as unknown as HeadphonesGLTFResult;
  const groupRef = useRef<Group | null>(null);
  const shaderMaterialRef = useRef<ShaderMaterial | null>(null);

  const uniforms = useMemo(
    () => ({
      uAmbientLight: { value: [0.1, 0.1, 0.1] },
      uSpotLightColor1: { value: [1.0, 1.0, 1.0] },
      uSpotLightColor2: { value: [1.0, 1.0, 1.0] },
      uSpotLightPosition1: { value: new Vector3(5, 5, 5) },
      uSpotLightPosition2: { value: new Vector3(-5, 5, 5) },
      uSpotLightDirection1: { value: new Vector3(-1, -1, -1) },
      uSpotLightDirection2: { value: new Vector3(1, -1, -1) },
      uSpotLightCutoff1: { value: Math.cos(MathUtils.degToRad(30)) },
      uSpotLightCutoff2: { value: Math.cos(MathUtils.degToRad(30)) },
      pixelSize: { value: 10.0 }, // pixel size for the dithering effect
      uHovered: { value: false },
    }),
    [],
  );
  useFrame(() => {
    if (groupRef.current && !hovered) {
      groupRef.current.rotation.z -= 0.008; // Adjust the rotation speed as needed
    }
  });

  const onPointerEnter = (e: ThreeEvent<PointerEvent>) => {
    if (shaderMaterialRef.current) {
      shaderMaterialRef.current.uniforms.uHovered = { value: false };
    }
    shaderMaterialRef.current = (e.object as Mesh).material as ShaderMaterial;
    if (shaderMaterialRef.current)
      shaderMaterialRef.current.uniforms.uHovered = { value: true };
    handleHovered(true, e);
  };
  const onPointerLeave = () => {
    handleHovered(false);
    if (shaderMaterialRef.current)
      shaderMaterialRef.current.uniforms.uHovered = { value: false };
    shaderMaterialRef.current = null;
  };
  return (
    <group
      ref={groupRef}
      dispose={null}
      position={[-6, 0, 0]}
      scale={0.3}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_4.geometry}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        userData={{
          customName: 'object_4',
          customDescription: 'this is a metallic part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader6}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_6.geometry}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        userData={{
          customName: 'object_6',
          customDescription: 'this is a metallic base',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader6}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.SIDE_MAT.map },
              uColor: { value: materials.SIDE_MAT.color },
              uRoughness: { value: materials.SIDE_MAT.roughness },
              uMetalness: { value: materials.SIDE_MAT.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_7.geometry}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        userData={{
          customName: 'object_7',
          customDescription: 'this is some leather',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader6}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.black_leather.map },
              uColor: { value: materials.black_leather.color },
              uRoughness: { value: materials.black_leather.roughness },
              uMetalness: { value: materials.black_leather.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_8.geometry}
        userData={{
          customName: 'object_8',
          customDescription: 'this is a metallic part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader6}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_9.geometry}
        userData={{
          customName: 'object_9',
          customDescription: 'this is a front part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader6}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.FRONT_MAT.map },
              uColor: { value: materials.FRONT_MAT.color },
              uRoughness: { value: materials.FRONT_MAT.roughness },
              uMetalness: { value: materials.FRONT_MAT.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_10.geometry}
        userData={{
          customName: 'object_10',
          customDescription: 'this is an inside part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader6}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.inside.map },
              uColor: { value: materials.inside.color },
              uRoughness: { value: materials.inside.roughness },
              uMetalness: { value: materials.inside.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_12.geometry}
        userData={{
          customName: 'object_12',
          customDescription: 'this is metallic part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader6}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_14.geometry}
        userData={{
          customName: 'object_14',
          customDescription: 'this is another metallic part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader6}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_16.geometry}
        userData={{
          customName: 'object_16',
          customDescription: 'this is other metallic part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader6}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_18.geometry}
        userData={{
          customName: 'object_18',
          customDescription: 'this is metallic',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader6}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_20.geometry}
        userData={{
          customName: 'object_20',
          customDescription: 'this is black leather',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader6}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.black_leather.map },
              uColor: { value: materials.black_leather.color },
              uRoughness: { value: materials.black_leather.roughness },
              uMetalness: { value: materials.black_leather.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_21.geometry}
        userData={{
          customName: 'object_21',
          customDescription: 'this is the top',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader6}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.leather_top.map },
              uColor: { value: materials.leather_top.color },
              uRoughness: { value: materials.leather_top.roughness },
              uMetalness: { value: materials.leather_top.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_23.geometry}
        userData={{
          customName: 'object_23',
          customDescription: 'this is some black leather',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader6}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.black_leather.map },
              uColor: { value: materials.black_leather.color },
              uRoughness: { value: materials.black_leather.roughness },
              uMetalness: { value: materials.black_leather.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        castShadow
        receiveShadow
        geometry={nodes.Object_25.geometry}
        userData={{
          customName: 'object_25',
          customDescription: 'this is the side logo',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader6}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.side_logo.map },
              uColor: { value: materials.side_logo.color },
              uRoughness: { value: materials.side_logo.roughness },
              uMetalness: { value: materials.side_logo.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
    </group>
  );
}

export function Model3({ handleHovered, hovered }: Model2Props) {
  const { nodes, materials } = useGLTF(
    highPollyHeadphone,
  ) as unknown as HeadphonesGLTFResult;

  const groupRef = useRef<Group | null>(null);
  const shaderMaterialRef = useRef<ShaderMaterial | null>(null);

  const uniforms = useMemo(
    () => ({
      uAmbientLight: { value: [0.1, 0.1, 0.1] },
      uSpotLightColor1: { value: [1.0, 1.0, 1.0] },
      uSpotLightColor2: { value: [1.0, 1.0, 1.0] },
      uSpotLightPosition1: { value: new Vector3(5, 5, 5) },
      uSpotLightPosition2: { value: new Vector3(-5, 5, 5) },
      uSpotLightDirection1: { value: new Vector3(-1, -1, -1) },
      uSpotLightDirection2: { value: new Vector3(1, -1, -1) },
      uSpotLightCutoff1: { value: Math.cos(MathUtils.degToRad(30)) },
      uSpotLightCutoff2: { value: Math.cos(MathUtils.degToRad(30)) },
      pixelSize: { value: 10.0 }, // pixel size for the dithering effect
      uHovered: { value: false },
    }),
    [],
  );

  useFrame(() => {
    if (groupRef.current && !hovered) {
      groupRef.current.rotation.z -= 0.008; // Adjust the rotation speed as needed
    }
  });

  const onPointerEnter = (e: ThreeEvent<PointerEvent>) => {
    if (shaderMaterialRef.current) {
      shaderMaterialRef.current.uniforms.uHovered = { value: false };
    }
    shaderMaterialRef.current = (e.object as Mesh).material as ShaderMaterial;
    if (shaderMaterialRef.current)
      shaderMaterialRef.current.uniforms.uHovered = { value: true };
    handleHovered(true, e);
  };
  const onPointerLeave = () => {
    handleHovered(false);
    if (shaderMaterialRef.current)
      shaderMaterialRef.current.uniforms.uHovered = { value: false };
    shaderMaterialRef.current = null;
  };
  return (
    <group
      ref={groupRef}
      dispose={null}
      position={[-2, 0, 0]}
      scale={0.3}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_4.geometry}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        userData={{
          customName: 'object_4',
          customDescription: 'this is a metallic part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader7}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_6.geometry}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        userData={{
          customName: 'object_6',
          customDescription: 'this is a metallic base',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader7}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.SIDE_MAT.map },
              uColor: { value: materials.SIDE_MAT.color },
              uRoughness: { value: materials.SIDE_MAT.roughness },
              uMetalness: { value: materials.SIDE_MAT.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_7.geometry}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        userData={{
          customName: 'object_7',
          customDescription: 'this is some leather',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader7}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.black_leather.map },
              uColor: { value: materials.black_leather.color },
              uRoughness: { value: materials.black_leather.roughness },
              uMetalness: { value: materials.black_leather.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_8.geometry}
        userData={{
          customName: 'object_8',
          customDescription: 'this is a metallic part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader7}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_9.geometry}
        userData={{
          customName: 'object_9',
          customDescription: 'this is a front part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader7}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.FRONT_MAT.map },
              uColor: { value: materials.FRONT_MAT.color },
              uRoughness: { value: materials.FRONT_MAT.roughness },
              uMetalness: { value: materials.FRONT_MAT.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_10.geometry}
        userData={{
          customName: 'object_10',
          customDescription: 'this is an inside part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader7}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.inside.map },
              uColor: { value: materials.inside.color },
              uRoughness: { value: materials.inside.roughness },
              uMetalness: { value: materials.inside.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_12.geometry}
        userData={{
          customName: 'object_12',
          customDescription: 'this is metallic part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader7}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_14.geometry}
        userData={{
          customName: 'object_14',
          customDescription: 'this is another metallic part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader7}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_16.geometry}
        userData={{
          customName: 'object_16',
          customDescription: 'this is other metallic part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader7}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_18.geometry}
        userData={{
          customName: 'object_18',
          customDescription: 'this is metallic',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader7}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_20.geometry}
        userData={{
          customName: 'object_20',
          customDescription: 'this is black leather',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader7}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.black_leather.map },
              uColor: { value: materials.black_leather.color },
              uRoughness: { value: materials.black_leather.roughness },
              uMetalness: { value: materials.black_leather.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_21.geometry}
        userData={{
          customName: 'object_21',
          customDescription: 'this is the top',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader7}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.leather_top.map },
              uColor: { value: materials.leather_top.color },
              uRoughness: { value: materials.leather_top.roughness },
              uMetalness: { value: materials.leather_top.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_23.geometry}
        userData={{
          customName: 'object_23',
          customDescription: 'this is some black leather',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader7}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.black_leather.map },
              uColor: { value: materials.black_leather.color },
              uRoughness: { value: materials.black_leather.roughness },
              uMetalness: { value: materials.black_leather.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        castShadow
        receiveShadow
        geometry={nodes.Object_25.geometry}
        userData={{
          customName: 'object_25',
          customDescription: 'this is the side logo',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader7}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.side_logo.map },
              uColor: { value: materials.side_logo.color },
              uRoughness: { value: materials.side_logo.roughness },
              uMetalness: { value: materials.side_logo.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
    </group>
  );
}

export function Model4({ handleHovered, hovered }: Model2Props) {
  const { nodes, materials } = useGLTF(
    highPollyHeadphone,
  ) as unknown as HeadphonesGLTFResult;
  const groupRef = useRef<Group | null>(null);
  const shaderMaterialRef = useRef<ShaderMaterial | null>(null);

  const uniforms = useMemo(
    () => ({
      uAmbientLight: { value: [0.1, 0.1, 0.1] },
      uSpotLightColor1: { value: [1.0, 1.0, 1.0] },
      uSpotLightColor2: { value: [1.0, 1.0, 1.0] },
      uSpotLightPosition1: { value: new Vector3(5, 5, 5) },
      uSpotLightPosition2: { value: new Vector3(-5, 5, 5) },
      uSpotLightDirection1: { value: new Vector3(-1, -1, -1) },
      uSpotLightDirection2: { value: new Vector3(1, -1, -1) },
      uSpotLightCutoff1: { value: Math.cos(MathUtils.degToRad(30)) },
      uSpotLightCutoff2: { value: Math.cos(MathUtils.degToRad(30)) },
      pixelSize: { value: 10.0 }, // pixel size for the dithering effect
      uHovered: { value: false },
    }),
    [],
  );
  useFrame(() => {
    if (groupRef.current && !hovered) {
      groupRef.current.rotation.z -= 0.008; // Adjust the rotation speed as needed
    }
  });

  const onPointerEnter = (e: ThreeEvent<PointerEvent>) => {
    if (shaderMaterialRef.current) {
      shaderMaterialRef.current.uniforms.uHovered = { value: false };
    }
    shaderMaterialRef.current = (e.object as Mesh).material as ShaderMaterial;
    if (shaderMaterialRef.current)
      shaderMaterialRef.current.uniforms.uHovered = { value: true };
    handleHovered(true, e);
  };
  const onPointerLeave = () => {
    handleHovered(false);
    if (shaderMaterialRef.current)
      shaderMaterialRef.current.uniforms.uHovered = { value: false };
    shaderMaterialRef.current = null;
  };
  return (
    <group
      ref={groupRef}
      dispose={null}
      position={[2, 0, 0]}
      scale={0.3}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_4.geometry}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        userData={{
          customName: 'object_4',
          customDescription: 'this is a metallic part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader8}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_6.geometry}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        userData={{
          customName: 'object_6',
          customDescription: 'this is a metallic base',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader8}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.SIDE_MAT.map },
              uColor: { value: materials.SIDE_MAT.color },
              uRoughness: { value: materials.SIDE_MAT.roughness },
              uMetalness: { value: materials.SIDE_MAT.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_7.geometry}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        userData={{
          customName: 'object_7',
          customDescription: 'this is some leather',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader8}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.black_leather.map },
              uColor: { value: materials.black_leather.color },
              uRoughness: { value: materials.black_leather.roughness },
              uMetalness: { value: materials.black_leather.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_8.geometry}
        userData={{
          customName: 'object_8',
          customDescription: 'this is a metallic part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader8}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_9.geometry}
        userData={{
          customName: 'object_9',
          customDescription: 'this is a front part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader8}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.FRONT_MAT.map },
              uColor: { value: materials.FRONT_MAT.color },
              uRoughness: { value: materials.FRONT_MAT.roughness },
              uMetalness: { value: materials.FRONT_MAT.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_10.geometry}
        userData={{
          customName: 'object_10',
          customDescription: 'this is an inside part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader8}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.inside.map },
              uColor: { value: materials.inside.color },
              uRoughness: { value: materials.inside.roughness },
              uMetalness: { value: materials.inside.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_12.geometry}
        userData={{
          customName: 'object_12',
          customDescription: 'this is metallic part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader8}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_14.geometry}
        userData={{
          customName: 'object_14',
          customDescription: 'this is another metallic part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader8}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_16.geometry}
        userData={{
          customName: 'object_16',
          customDescription: 'this is other metallic part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader8}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_18.geometry}
        userData={{
          customName: 'object_18',
          customDescription: 'this is metallic',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader8}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_20.geometry}
        userData={{
          customName: 'object_20',
          customDescription: 'this is black leather',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader8}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.black_leather.map },
              uColor: { value: materials.black_leather.color },
              uRoughness: { value: materials.black_leather.roughness },
              uMetalness: { value: materials.black_leather.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_21.geometry}
        userData={{
          customName: 'object_21',
          customDescription: 'this is the top',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader8}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.leather_top.map },
              uColor: { value: materials.leather_top.color },
              uRoughness: { value: materials.leather_top.roughness },
              uMetalness: { value: materials.leather_top.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_23.geometry}
        userData={{
          customName: 'object_23',
          customDescription: 'this is some black leather',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader8}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.black_leather.map },
              uColor: { value: materials.black_leather.color },
              uRoughness: { value: materials.black_leather.roughness },
              uMetalness: { value: materials.black_leather.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        castShadow
        receiveShadow
        geometry={nodes.Object_25.geometry}
        userData={{
          customName: 'object_25',
          customDescription: 'this is the side logo',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader8}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.side_logo.map },
              uColor: { value: materials.side_logo.color },
              uRoughness: { value: materials.side_logo.roughness },
              uMetalness: { value: materials.side_logo.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
    </group>
  );
}

export function Model5({ handleHovered, hovered }: Model2Props) {
  const { nodes, materials } = useGLTF(
    highPollyHeadphone,
  ) as unknown as HeadphonesGLTFResult;
  const groupRef = useRef<Group | null>(null);
  const shaderMaterialRef = useRef<ShaderMaterial | null>(null);

  const uniforms = useMemo(
    () => ({
      uAmbientLight: { value: [0.1, 0.1, 0.1] },
      uSpotLightColor1: { value: [1.0, 1.0, 1.0] },
      uSpotLightColor2: { value: [1.0, 1.0, 1.0] },
      uSpotLightPosition1: { value: new Vector3(5, 5, 5) },
      uSpotLightPosition2: { value: new Vector3(-5, 5, 5) },
      uSpotLightDirection1: { value: new Vector3(-1, -1, -1) },
      uSpotLightDirection2: { value: new Vector3(1, -1, -1) },
      uSpotLightCutoff1: { value: Math.cos(MathUtils.degToRad(30)) },
      uSpotLightCutoff2: { value: Math.cos(MathUtils.degToRad(30)) },
      pixelSize: { value: 10.0 }, // pixel size for the dithering effect
      uHovered: { value: false },
    }),
    [],
  );
  useFrame(() => {
    if (groupRef.current && !hovered) {
      groupRef.current.rotation.z -= 0.008; // Adjust the rotation speed as needed
    }
  });

  const onPointerEnter = (e: ThreeEvent<PointerEvent>) => {
    if (shaderMaterialRef.current) {
      shaderMaterialRef.current.uniforms.uHovered = { value: false };
    }
    shaderMaterialRef.current = (e.object as Mesh).material as ShaderMaterial;
    if (shaderMaterialRef.current)
      shaderMaterialRef.current.uniforms.uHovered = { value: true };
    handleHovered(true, e);
  };
  const onPointerLeave = () => {
    handleHovered(false);
    if (shaderMaterialRef.current)
      shaderMaterialRef.current.uniforms.uHovered = { value: false };
    shaderMaterialRef.current = null;
  };
  return (
    <group
      ref={groupRef}
      dispose={null}
      position={[6, 0, 0]}
      scale={0.3}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_4.geometry}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        userData={{
          customName: 'object_4',
          customDescription: 'this is a metallic part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader9}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_6.geometry}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        userData={{
          customName: 'object_6',
          customDescription: 'this is a metallic base',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader9}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.SIDE_MAT.map },
              uColor: { value: materials.SIDE_MAT.color },
              uRoughness: { value: materials.SIDE_MAT.roughness },
              uMetalness: { value: materials.SIDE_MAT.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_7.geometry}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        userData={{
          customName: 'object_7',
          customDescription: 'this is some leather',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader9}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.black_leather.map },
              uColor: { value: materials.black_leather.color },
              uRoughness: { value: materials.black_leather.roughness },
              uMetalness: { value: materials.black_leather.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_8.geometry}
        userData={{
          customName: 'object_8',
          customDescription: 'this is a metallic part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader9}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_9.geometry}
        userData={{
          customName: 'object_9',
          customDescription: 'this is a front part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader9}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.FRONT_MAT.map },
              uColor: { value: materials.FRONT_MAT.color },
              uRoughness: { value: materials.FRONT_MAT.roughness },
              uMetalness: { value: materials.FRONT_MAT.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_10.geometry}
        userData={{
          customName: 'object_10',
          customDescription: 'this is an inside part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader9}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.inside.map },
              uColor: { value: materials.inside.color },
              uRoughness: { value: materials.inside.roughness },
              uMetalness: { value: materials.inside.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_12.geometry}
        userData={{
          customName: 'object_12',
          customDescription: 'this is metallic part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader9}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_14.geometry}
        userData={{
          customName: 'object_14',
          customDescription: 'this is another metallic part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader9}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_16.geometry}
        userData={{
          customName: 'object_16',
          customDescription: 'this is other metallic part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader9}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_18.geometry}
        userData={{
          customName: 'object_18',
          customDescription: 'this is metallic',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader9}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_20.geometry}
        userData={{
          customName: 'object_20',
          customDescription: 'this is black leather',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader9}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.black_leather.map },
              uColor: { value: materials.black_leather.color },
              uRoughness: { value: materials.black_leather.roughness },
              uMetalness: { value: materials.black_leather.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_21.geometry}
        userData={{
          customName: 'object_21',
          customDescription: 'this is the top',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader9}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.leather_top.map },
              uColor: { value: materials.leather_top.color },
              uRoughness: { value: materials.leather_top.roughness },
              uMetalness: { value: materials.leather_top.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_23.geometry}
        userData={{
          customName: 'object_23',
          customDescription: 'this is some black leather',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader9}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.black_leather.map },
              uColor: { value: materials.black_leather.color },
              uRoughness: { value: materials.black_leather.roughness },
              uMetalness: { value: materials.black_leather.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        castShadow
        receiveShadow
        geometry={nodes.Object_25.geometry}
        userData={{
          customName: 'object_25',
          customDescription: 'this is the side logo',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader3}
          fragmentShader={fragmentShader9}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.side_logo.map },
              uColor: { value: materials.side_logo.color },
              uRoughness: { value: materials.side_logo.roughness },
              uMetalness: { value: materials.side_logo.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
    </group>
  );
}
interface ObjectUserData {
  name: string;
  description: string;
}
export default function App() {
  const initialUserData: ObjectUserData = {
    description: '',
    name: '',
  };
  const [hovered, setHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [userData, setUserData] = useState<ObjectUserData>(initialUserData);
  const handleHovered = (
    isHovered: boolean,
    event?: ThreeEvent<PointerEvent>,
  ) => {
    setHovered(isHovered);
    if (event) {
      setMousePos({ x: event.clientX, y: event.clientY });
      setUserData({
        name: event.object.userData.customName,
        description: event.object.userData.customDescription,
      });
    }
  };
  return (
    <div style={{ position: 'relative' }}>
      <h1>hola</h1>
      <p>p</p>
      <Canvas style={{ background: 'black' }}>
        <OrbitControls />
        <Stats />
        <Perf position={[10, 10, 10]} deepAnalize />
        <directionalLight color="white" />
        <Suspense>
          <Model2 handleHovered={handleHovered} hovered={hovered} />
          <Model4 handleHovered={handleHovered} hovered={hovered} />
          <Model3 handleHovered={handleHovered} hovered={hovered} />
          <Model5 handleHovered={handleHovered} hovered={hovered} />
          <Preload all />
        </Suspense>
      </Canvas>
      {hovered && (
        <div
          style={{
            position: 'absolute',
            top: mousePos.y + 10, // Adding some offset
            left: mousePos.x + 10, // Adding some offset
            background: 'white',
            padding: '5px',
            borderRadius: '3px',
            pointerEvents: 'none', // Prevent blocking mouse events
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <p>{userData.name}</p>
          <p>{userData.description}</p>
        </div>
      )}
    </div>
  );
}
