struct CameraUniform {
  viewProjectionMatrix: mat4x4<f32>,
}

struct TransformationUniform {
  transformationMatrix: mat4x4<f32>,
}

struct DirectLight {
  intensity: f32,
  rotationMatrix: mat3x3<f32>
}

struct PointLight {
  position: vec3f,
  intensity: f32,
  range: f32,
}

@group(0) @binding(0) var<uniform> camera : CameraUniform;
@group(0) @binding(1) var<storage> directLights: array<DirectLight>;
@group(0) @binding(2) var<storage> pointLights: array<PointLight>;

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
    @location(1) normal: vec3f,
    @location(2) worldPosition: vec4f
}

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  let worldPosition = transform.transformationMatrix * input.position;

  output.worldPosition = worldPosition;
  output.position = camera.viewProjectionMatrix * worldPosition;
  output.uv = input.uv;
  output.normal = rotation * input.normal;
  
  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  var directLightsLength = arrayLength(&directLights);
  var pointLightsLength = arrayLength(&pointLights);

  var light = 0f;

  for(var i=0u; i < directLightsLength; i++) {
    let directLight = directLights[i];
    let x = dot(input.normal, -normalize(directLight.rotationMatrix * vec3f(0, 0, 1))) * directLight.intensity;

    if x > 0f {
      light = light + x * 1.00001f;
    }
  }

  for(var i=0u; i < pointLightsLength; i++) {
    let pointLight = pointLights[i];

    let deltaVector = pointLight.position - input.worldPosition.xyz;
    let distanceCoefficient = 1f - length(deltaVector) / pointLight.range;

    let x = dot(input.normal, normalize(deltaVector));

    if distanceCoefficient > 0f && x > 0f {
      light = light + x * distanceCoefficient * pointLight.intensity;
    }
  }

  var objectColor = textureSample(myTexture, mySampler, input.uv);

  return vec4f(objectColor.rgb * light, 1); 
}
