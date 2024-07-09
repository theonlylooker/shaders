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
