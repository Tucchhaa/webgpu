@vertex
fn vertexMain(@location(0) position: vec4f) -> @builtin(position) vec4f {
  return vec4f(position.xy, 0, 1);
}

@fragment
fn fragmentMain() -> @location(0) vec4f {
    return vec4f(1, 1, 1, 1);
}
