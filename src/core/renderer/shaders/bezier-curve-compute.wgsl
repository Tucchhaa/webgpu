struct Curve {
    point1: vec3f,
    slope1: vec3f,
    slope2: vec3f,
    point2: vec3f,
    thickness: f32,
};

struct Segment {
    triangle1_p1: vec3f,
    triangle1_p2: vec3f,
    triangle1_p3: vec3f,

    triangle2_p1: vec3f,
    triangle2_p2: vec3f,
    triangle2_p3: vec3f,
};

@group(0) @binding(0) var<uniform> cameraPosition: vec3f;
@group(0) @binding(1) var<storage, read> curves : array<Curve>;
@group(0) @binding(2) var<storage, read_write> result : array<Segment>;

const SEGMENT_SIZE = 6u;
override SEGMENTS_PER_CURVE = 10u;

@compute @workgroup_size(1)
fn computeMain(@builtin(global_invocation_id) global_id : vec3u) {
    let curvesLength = arrayLength(&curves);

    if(global_id.x >= curvesLength) {
        return;
    }

    let curveIndex = global_id.x;
    let curve = curves[curveIndex];
    let displace = curve.thickness / 2;
 
    let basisMatrix = mat4x4(
        1, -3, 3, -1,
        0, 3, -6, 3,
        0, 0, 3, -3,
        0, 0, 0, 1
    );

    // 4 points define the curve
    let curveMatrix = mat3x4(
        curve.point1.x, curve.slope1.x, curve.slope2.x, curve.point2.x,
        curve.point1.y, curve.slope1.y, curve.slope2.y, curve.point2.y,
        curve.point1.z, curve.slope1.z, curve.slope2.z, curve.point2.z,
    );
    let bezierMatrix = basisMatrix * curveMatrix;

    var prevPosition = vec4f(1, 0, 0, 0) * bezierMatrix;

    let resultCurveIndex = curveIndex * SEGMENTS_PER_CURVE;

    for(var i = 1u; i <= SEGMENTS_PER_CURVE; i++) {
        let segmentIndex = resultCurveIndex + i - 1;
        let t = f32(i) / f32(SEGMENTS_PER_CURVE);

        let tVector = vec4f(1, t, pow(t, 2), pow(t, 3));
        let position: vec3f = tVector * bezierMatrix;
        
        let toCamera = cameraPosition - position;
        
        let along = position - prevPosition;
        let across = normalize(cross(along, toCamera)) * displace;

        let p1 = select(result[segmentIndex - 1].triangle2_p1, prevPosition + across, segmentIndex == resultCurveIndex);
        let p2 = select(result[segmentIndex - 1].triangle2_p2, prevPosition - across, segmentIndex == resultCurveIndex);
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
        
        result[segmentIndex] = segment;

        prevPosition = position;
    }
}
