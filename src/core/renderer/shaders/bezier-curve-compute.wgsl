
@group(0) @binding(0) var<storage, read> curves : array<f32>;
@group(0) @binding(1) var<storage, read_write> result : array<f32>;

const SEGMENT_SIZE = 6u;
const CURVE_SIZE = 12u;
override SEGMENTS_PER_CURVE = 10u;

@compute @workgroup_size(1)
fn computeMain(@builtin(global_invocation_id) global_id : vec3u) {
    let curvesLength = arrayLength(&curves) / CURVE_SIZE;

    if(global_id.x >= curvesLength) {
        return;
    }

    let curveIndex = global_id.x * CURVE_SIZE;

    let basisMatrix = mat4x4(
        1, -3, 3, -1,
        0, 3, -6, 3,
        0, 0, 3, -3,
        0, 0, 0, 1
    );

    // 4 points define the curve
    let curveMatrix = mat3x4(
        curves[curveIndex + 0], curves[curveIndex + 3], curves[curveIndex + 6], curves[curveIndex + 9],
        curves[curveIndex + 1], curves[curveIndex + 4], curves[curveIndex + 7], curves[curveIndex + 10],
        curves[curveIndex + 2], curves[curveIndex + 5], curves[curveIndex + 8], curves[curveIndex + 11],
    );

    let bezierMatrix = basisMatrix * curveMatrix;

    var prevPosition = vec4f(1, 0, 0, 0) * bezierMatrix;

    let resultCurveIndex = global_id.x * SEGMENTS_PER_CURVE * SEGMENT_SIZE;

    for(var i = 1u; i <= SEGMENTS_PER_CURVE; i++) {
        let t = f32(i) / f32(SEGMENTS_PER_CURVE);

        let tVector = vec4f(1, t, pow(t, 2), pow(t, 3));

        let position: vec3f = tVector * bezierMatrix;

        let segmentIndex = (i - 1) * SEGMENT_SIZE;
        let index = resultCurveIndex + segmentIndex;

        result[index + 0] = prevPosition.x;
        result[index + 1] = prevPosition.y;
        result[index + 2] = prevPosition.z;
        result[index + 3] = position.x;
        result[index + 4] = position.y;
        result[index + 5] = position.z;

        prevPosition = position;
    }
}
