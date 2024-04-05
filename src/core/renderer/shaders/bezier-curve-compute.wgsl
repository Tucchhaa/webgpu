struct Options {
    thickness: f32,
};

struct Curve {
    point1: vec3f,
    slope1: vec3f,
    slope2: vec3f,
    point2: vec3f,
};

struct Segment {
    triangle1_p1: vec3f,
    triangle1_p2: vec3f,
    triangle1_p3: vec3f,

    triangle2_p1: vec3f,
    triangle2_p2: vec3f,
    triangle2_p3: vec3f,
};

@group(0) @binding(0) var<uniform> options: Options;
@group(0) @binding(1) var<uniform> cameraPosition: vec3f;
@group(0) @binding(2) var<storage, read> curves : array<f32>;
@group(0) @binding(3) var<storage, read_write> segments : array<Segment>;
@group(0) @binding(4) var<storage, read_write> pivots: array<vec4f>;

const CURVE_SIZE = 12u; // 4 points * xyz
override SEGMENTS_PER_CURVE = 10u;

const PIVOTS_PER_CURVE = 4u;
const PIVOT_SIZE = 12u; // 4 TRIANGLES * 3 VERTEX
override PIVOT_TRIANGLE_RADIUS = 0.15f;


const basisMatrix = mat4x4(
    1, -3, 3, -1,
    0, 3, -6, 3,
    0, 0, 3, -3,
    0, 0, 0, 1
);

@compute @workgroup_size(1)
fn computeMain(
    @builtin(workgroup_id) workgroup_id : vec3u, 
    @builtin(local_invocation_index) local_index: u32
) {
    let curvesLength = arrayLength(&curves);

    let curveIndex = workgroup_id.x;

    if(curveIndex >= curvesLength) {
        return;
    }

    let curve = getCurveAt(curveIndex);

    computeSegments(curve, curveIndex);

    computePivots(curve, curveIndex);
}

fn computeSegments(curve: Curve, curveIndex: u32) {
    let resultCurveIndex = curveIndex * SEGMENTS_PER_CURVE;

    let displace = options.thickness / 2;
 
    // 4 points define the curve
    let curveMatrix = mat3x4(
        curve.point1.x, curve.slope1.x, curve.slope2.x, curve.point2.x,
        curve.point1.y, curve.slope1.y, curve.slope2.y, curve.point2.y,
        curve.point1.z, curve.slope1.z, curve.slope2.z, curve.point2.z,
    );
    let bezierMatrix = basisMatrix * curveMatrix;

    var prevPosition = vec4f(1, 0, 0, 0) * bezierMatrix;

    for(var i = 1u; i <= SEGMENTS_PER_CURVE; i++) {
        let segmentIndex = resultCurveIndex + i - 1;
        let t = f32(i) / f32(SEGMENTS_PER_CURVE);

        let tVector = vec4f(1, t, pow(t, 2), pow(t, 3));
        let position: vec3f = tVector * bezierMatrix;
        
        let toCamera = cameraPosition - position;
        
        let along = position - prevPosition;
        let across = normalize(cross(along, toCamera)) * displace;

        let p1 = select(segments[segmentIndex - 1].triangle2_p1, prevPosition + across, segmentIndex == resultCurveIndex);
        let p2 = select(segments[segmentIndex - 1].triangle2_p2, prevPosition - across, segmentIndex == resultCurveIndex);
        // let p1 = prevPosition + across;
        // let p2 = prevPosition - across;
        let p3 = position + across;
        let p4 = position - across;

        var segment: Segment = Segment();
        segment.triangle1_p1 = p1;
        segment.triangle1_p2 = p2;
        segment.triangle1_p3 = p3;
        segment.triangle2_p1 = p3;
        segment.triangle2_p2 = p4;
        segment.triangle2_p3 = p2;
        
        segments[segmentIndex] = segment;

        prevPosition = position;
    }
}

fn computePivots(curve: Curve, curveIndex: u32) {
    let index = curveIndex * PIVOTS_PER_CURVE * PIVOT_SIZE;

    computePivot(curve.point1, index);
    computePivot(curve.slope1, index + PIVOT_SIZE);
    computePivot(curve.slope2, index + PIVOT_SIZE * 2);
    computePivot(curve.point2, index + PIVOT_SIZE * 3);
}

fn computePivot(position: vec3f, index: u32) {
    const PI = 3.14159f;
    let toCamera = cameraPosition - position;

    let temp = toCamera + vec3f(0, 1, 0);

    let base1 = normalize(cross(toCamera, temp));
    let base2 = normalize(cross(toCamera, base1));

    let center = vec4f(position, 1);
    let p1 = center + vec4f(base1, 0) * PIVOT_TRIANGLE_RADIUS;
    let p2 = center + vec4f(base2, 0) * PIVOT_TRIANGLE_RADIUS;
    let p3 = center - vec4f(base1, 0) * PIVOT_TRIANGLE_RADIUS;
    let p4 = center - vec4f(base2, 0) * PIVOT_TRIANGLE_RADIUS;

    // triangle 1
    pivots[index] = center;
    pivots[index + 1] = p1;
    pivots[index + 2] = p2;

    // triangle 2
    pivots[index + 3] = center;
    pivots[index + 4] = p2;
    pivots[index + 5] = p3;

    // triangle 3
    pivots[index + 6] = center;
    pivots[index + 7] = p3;
    pivots[index + 8] = p4;

    // triangle 4
    pivots[index + 9] = center;
    pivots[index + 10] = p4;
    pivots[index + 11] = p1;
}

fn getCurveAt(curveIndex: u32) -> Curve {
    let start = CURVE_SIZE * curveIndex;

    var curve = Curve();
    curve.point1 = vec3f(curves[start + 0], curves[start + 1], curves[start + 2]);
    curve.slope1 = vec3f(curves[start + 3], curves[start + 4], curves[start + 5]);
    curve.slope2 = vec3f(curves[start + 6], curves[start + 7], curves[start + 8]);
    curve.point2 = vec3f(curves[start + 9], curves[start + 10], curves[start + 11]);

    return curve;
}
