
@group(0) @binding(0) var<uniform> viewProjectionMatrix: mat4x4<f32>;

@vertex
fn vertexMain(@location(0) position: vec4f) -> @builtin(position) vec4f {
  // _ = viewProjectionMatrix;
  // return vec4f(position.xy, 0, 1);
  return viewProjectionMatrix * vec4f(position.xyz, 1);
}

@fragment
fn fragmentMain() -> @location(0) vec4f {
    return vec4f(41/255, 41/255, 41/255, 1);
}
