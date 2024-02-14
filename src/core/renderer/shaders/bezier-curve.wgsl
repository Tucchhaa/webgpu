
@group(0) @binding(0) var<uniform> viewProjectionMatrix: mat4x4<f32>;

@vertex
fn vertexMain(@location(0) position: vec4f) -> @builtin(position) vec4f {
  return viewProjectionMatrix * position;
}

@fragment
fn fragmentMain() -> @location(0) vec4f {
    return vec4f(41/255, 41/255, 41/255, 1);
}
