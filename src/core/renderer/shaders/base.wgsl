struct Camera {
  viewProjectionMatrix: mat4x4<f32>,
  position: vec3f
}

struct TransformationUniform {
  transformationMatrix: mat4x4<f32>,
  rotationMatrix: mat3x3<f32>
}

struct DirectLight {
  color: vec3f,
  intensity: f32,
  rotationMatrix: mat3x3<f32>
}

struct PointLight {
  position: vec3f,
  intensity: f32,
  color: vec3f,
  range: f32,
  direction: vec3f,
  angle: f32,
}

@group(0) @binding(0) var<uniform> camera : Camera;
@group(0) @binding(1) var<storage> directLights: array<DirectLight>;
@group(0) @binding(2) var<storage> pointLights: array<PointLight>;

@group(1) @binding(0) var<uniform> transform: TransformationUniform;
@group(1) @binding(1) var mySampler: sampler;
@group(1) @binding(2) var myTexture: texture_2d<f32>;

struct VertexInput {
    @location(0) position: vec4f,
    @location(1) uv: vec2f,
    @location(2) normal: vec3f,
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) normal: vec3f,
    @location(2) worldPosition: vec4f
}

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  let worldPosition = transform.transformationMatrix * input.position;

  output.position = camera.viewProjectionMatrix * worldPosition;
  output.uv = input.uv;
  output.normal = transform.rotationMatrix * input.normal;
  output.worldPosition = worldPosition;
  
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  var directLightsLength = arrayLength(&directLights);
  var pointLightsLength = arrayLength(&pointLights);

  var c_result = vec3f(0, 0, 0);

  let c_surface = textureSample(myTexture, mySampler, input.uv).rgb;
  let c_highlight = vec3f(1, 1, 1);
  let c_unlit = vec3f(0, 0, 0);
  
  let n = normalize(input.normal);
  let v = normalize(camera.position - input.worldPosition.xyz);

  for(var i=0u; i < directLightsLength; i++) {
    let light = directLights[i];

    let l = light.rotationMatrix * vec3f(0, 0, -1);
    let t = clamp(dot(n, l), 0, 1) * light.intensity;

    let c_shaded = light.color / 255 * mix(c_unlit, c_surface, t);

    c_result += c_shaded;
  }

  for(var i=0u; i < pointLightsLength; i++) {
    let light = pointLights[i];

    let l = normalize(light.position - input.worldPosition.xyz);
    let t = clamp(dot(n, l), 0, 1) * light.intensity;

    let distance = length(light.position - input.worldPosition.xyz);
    let d = pow(max(1f - pow(distance / light.range, 2), 0), 2);

    // if(dot(light.direction, l) >= cos(light.angle)) {

    var r = -reflect(l, n);
    var s = clamp(100 * dot(r, v) - 97, 0, 1);

    s = 0;

    let c_shaded = light.color / 255 * mix(mix(c_unlit, c_surface, t * d), c_highlight, s * d);
    // let c_shaded = light.color / 255 * mix(c_surface.xyz, c_highlight, s);

    c_result += c_shaded;
    // }
  }

  return vec4f(c_result, 1);
}