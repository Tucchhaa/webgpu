import { MeshComponent } from "../components";
import OBJFile from 'obj-file-parser';
import { Material } from "../material";
import { Vec3, vec3 } from "wgpu-matrix";

const SHADERS_LOCATION = 'src/core/renderer/shaders';
const MESH_LOCATION = `src/resources/meshes`;

export class ResourceLoader {
    static async loadMesh(meshName: string): Promise<MeshComponent> {
        const response = await fetch(`${MESH_LOCATION}/${meshName}.obj`);

        const raw = await response.text();

        const parser = new OBJFile(raw);
        const obj = parser.parse();

        const vertices: number[] = [];

        for(let modelInd = 0; modelInd < 1; modelInd++) {
            const model = obj.models[modelInd]!;

            for(let i=0; i < model.faces.length; i++) {
                const face = model.faces[i]!;

                for(let j=1; j < face.vertices.length - 1; j++) {
                    const triangle: { pos: Vec3, u: number, v: number}[] = [];

                    [0, j, j + 1].map(vertexInd => {
                        const vertexInfo = face.vertices[vertexInd]!;

                        const index = vertexInfo.vertexIndex - 1;
                        const textureIndex = vertexInfo.textureCoordsIndex - 1;

                        const coord = model.vertices[index]!;
                        const textureCoord = model.textureCoords[textureIndex]!;

                        triangle.push({ pos: vec3.create(coord.x, coord.y, coord.z), u: textureCoord.u, v: 1 - textureCoord.v });
                    });

                    const normal = vec3.cross(vec3.sub(triangle[1]!.pos, triangle[0]!.pos), vec3.sub(triangle[2]!.pos, triangle[0]!.pos));
                    
                    for(const vertex of triangle) {
                        vertices.push(...vertex.pos, vertex.u, vertex.v, ...normal);
                    }
                }
            }
        }

        const res = await fetch('src/resources/meshes/jet/jet.png');
        const img = await res.blob();
        const bitmap = await createImageBitmap(img);

        const material = new Material({ textureBitmap: bitmap, samplerMagFilter: 'linear', samplerMinFilter: 'linear' });
        const meshComponent = new MeshComponent(new Float32Array(vertices), material); 

        return meshComponent;
    }

    static async loadShader(shaderName: string): Promise<string> {
        const response = await fetch(`${SHADERS_LOCATION}/${shaderName}.wgsl`);

        const shader = await response.text();
    
        return shader;
    }
}
