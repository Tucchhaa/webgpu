struct Camera {
  viewProjectionMatrix: mat4x4<f32>,
  position: vec3f
}

struct TransformationUniform {
  transformationMatrix: mat4x4<f32>,
  rotationMatrix: mat3x3<f32>
}

struct DirectLight {
  intensity: f32,
  rotationMatrix: mat3x3<f32>
}

struct PointLight {
  position: vec3f,
  intensity: f32,
  color: vec3f,
  range: f32,
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

// @fragment
// fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
//   var directLightsLength = arrayLength(&directLights);
//   var pointLightsLength = arrayLength(&pointLights);

//   var light = 0f;

//   for(var i=0u; i < directLightsLength; i++) {
//     let directLight = directLights[i];
//     let x = dot(input.normal, -normalize(directLight.rotationMatrix * vec3f(0, 0, 1))) * directLight.intensity;

//     if x > 0f {
//       light = light + x * 1.00001f;
//     }
//   }

//   for(var i=0u; i < pointLightsLength; i++) {
//     let pointLight = pointLights[i];

//     let deltaVector = pointLight.position - input.worldPosition.xyz;
//     let distanceCoefficient = 1f - length(deltaVector) / pointLight.range;

//     let x = dot(input.normal, normalize(deltaVector));

//     if distanceCoefficient > 0f && x > 0f {
//       light = light + x * distanceCoefficient * pointLight.intensity;
//     }
//   }

//   var objectColor = textureSample(myTexture, mySampler, input.uv);

//   return vec4f(objectColor.rgb * light, 1); 
// }

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  var directLightsLength = arrayLength(&directLights);
  var pointLightsLength = arrayLength(&pointLights);

  var c_result = vec3f(0, 0, 0);

  let c_surface = textureSample(myTexture, mySampler, input.uv);

  let c_highlight = vec3f(1, 1, 1);
  let c_cool = vec3f(0, 0, 0);
  let c_warm = vec3f(0.3, 0.3, 0.3) + 0.25 * c_surface.xyz;
  
  let v = normalize(camera.position - input.worldPosition.xyz);

  for(var i=0u; i < 2; i++) {
    let light = pointLights[i];

    let normal = normalize(input.normal);
    let l = normalize(light.position - input.worldPosition.xyz);
    let _dot = dot(normal, l);

    let distance = length(light.position - input.worldPosition.xyz);

    if(_dot > 0f && distance <= light.range) {
      var t = ((_dot + 1) / 2);
      var r = -reflect(l, normal);
      var s = clamp(100 * dot(r, v) - 98, 0, 1);
      var d = 1f - distance / light.range;

      t = t * d * light.intensity;
      s = s * d;

      let c_shaded = light.color / 255 * mix(mix(c_cool, c_warm, t), c_highlight, s);

      c_result = c_result + c_shaded;
    }
  }

  return vec4f(c_result, 1);
}