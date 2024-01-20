export const DEPTH_TEXTURE_FORMAT: GPUTextureFormat = 'depth24plus';

export const CAMERA_BINDGROUP_INDEX = 0;
export const OBJECT_BINDGROUP_INDEX = 1;

export const MATRIX_3x4_BYTELENGTH = 48; // 4x3 matrix, each item is 4 byte => 9 * 4
export const MATRIX_4x4_BYTELENGTH = 64; // 4x4 matrix, each item is 4 byte => 16 * 4

export const VERTEX_COORD_BYTELENGTH = 12; // vec3 * 4
export const UV_COORD_BYTELENGTH = 8; // vec2 * 4
export const NORMAL_VECTOR_BYTELENGTH = 12; // vec3 * 4

export const STRIDE_SIZE = 3 + 2 + 3; // vertex + uv + normal
export const STRIDE_BYTELENGTH = VERTEX_COORD_BYTELENGTH + UV_COORD_BYTELENGTH + NORMAL_VECTOR_BYTELENGTH;