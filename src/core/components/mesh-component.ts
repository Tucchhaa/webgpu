import { Material } from "../material";
import { STRIDE_SIZE } from "../renderer/const";
import { EntityComponent } from "./entity-component";

export class MeshComponent extends EntityComponent {
    public vertices: Float32Array;

    public readonly polygonsCount: number;

    public material: Material;

    constructor(vertices: Float32Array, material: Material) {
        super();

        this.vertices = vertices;
        this.material = material;

        this.polygonsCount = Math.ceil(vertices.length / STRIDE_SIZE);
    }
}
