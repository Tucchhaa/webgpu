struct Matrix {
    size: vec2f,
    numbers: array<f32>,
}

@group(0) @binding(0) var<storage, read> firstMatrix : Matrix;
@group(0) @binding(1) var<storage, read> secondMatrix : Matrix;
@group(0) @binding(2) var<storage, read_write> resultMatrix : Matrix;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id : vec3u) {
    // Guard against out-of-bounds work group sizes
    if (global_id.x >= u32(firstMatrix.size.x) || global_id.y >= u32(secondMatrix.size.y)) {
        return;
    }

    resultMatrix.size = vec2(firstMatrix.size.x, secondMatrix.size.y);

    let resultCell = vec2(global_id.x, global_id.y);
    var result = 0.0;
    
    for (var i = 0u; i < u32(firstMatrix.size.y); i = i + 1u) {
        let a = i + resultCell.x * u32(firstMatrix.size.y);
        let b = resultCell.y + i * u32(secondMatrix.size.y);
        result = result + firstMatrix.numbers[a] * secondMatrix.numbers[b];
    }

    let index = resultCell.y + resultCell.x * u32(secondMatrix.size.y);
    resultMatrix.numbers[index] = result;
}
