struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) @interpolate(flat) instanceId: u32,
};

const colors = array<vec4f, 3>(
  vec4f(120f/255, 120f/255, 120f/255, 1), // grid 
  vec4f(0f/255, 0f/255, 0f/255, 1),  // curve,
  vec4f(0f/255, 100f/255, 148f/255, 1)  // pivot
);
@group(0) @binding(0) var<uniform> viewProjectionMatrix: mat4x4<f32>;

@vertex
fn vertexMain(
  @location(0) position: vec4f,
  @builtin(instance_index) instanceId: u32
) -> VertexOutput {
  var output: VertexOutput;

  output.position = viewProjectionMatrix * vec4f(position.xyz, 1);
  output.instanceId = instanceId;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  return colors[input.instanceId];
}
