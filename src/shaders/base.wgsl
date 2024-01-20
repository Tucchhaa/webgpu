struct CameraUniform {
  viewProjectionMatrix: mat4x4<f32>,
}

struct TransformationUniform {
  transformationMatrix: mat4x4<f32>,
}

@group(0) @binding(0) var<uniform> camera : CameraUniform;

@group(1) @binding(0) var<uniform> transform: TransformationUniform;
@group(1) @binding(1) var mySampler: sampler;
@group(1) @binding(2) var myTexture: texture_2d<f32>;

struct VertexInput {
    @location(0) position: vec4f,
    @location(1) uv: vec2f,
    @location(2) normal: vec4f,
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) normal: vec4f
}

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  output.position = camera.viewProjectionMatrix * transform.transformationMatrix * input.position;
  output.uv = input.uv;
  output.normal = input.normal;
  
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  var objectColor = textureSample(myTexture, mySampler, input.uv);

  return objectColor;
}
