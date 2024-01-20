struct CameraUniform {
  viewProjectionMatrix: mat4x4<f32>,
}

struct TransformationUniform {
  transformationMatrix: mat4x4<f32>,
}

@group(0) @binding(0) var<uniform> camera : CameraUniform;
@group(0) @binding(1) var<uniform> light: vec3f;

@group(1) @binding(0) var<uniform> transform: TransformationUniform;
@group(1) @binding(1) var mySampler: sampler;
@group(1) @binding(2) var myTexture: texture_2d<f32>;
@group(1) @binding(3) var<uniform> rotation: mat3x3<f32>;

struct VertexInput {
    @location(0) position: vec4f,
    @location(1) uv: vec2f,
    @location(2) normal: vec3f,
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) normal: vec3f
}

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  output.position = camera.viewProjectionMatrix * transform.transformationMatrix * input.position;
  output.uv = input.uv;
  output.normal = rotation * input.normal;
  
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  var light = dot(input.normal, -normalize(light));

  var objectColor = textureSample(myTexture, mySampler, input.uv);

  var color = vec4f(1 * light, 0, 0, 1);

  return vec4f(objectColor.rgb * light, 1);
}
