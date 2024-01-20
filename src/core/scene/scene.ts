import { CameraComponent, MeshComponent } from "../components";
import { SpaceEntity } from "../space-entity";

export class Scene {
    public mainCamera!: CameraComponent;

    public readonly lights: SpaceEntity[];

    public readonly meshes: MeshComponent[];

    constructor() {
        this.lights = [];
        this.meshes = [];
    }

    public addSpaceEntity(entity: SpaceEntity): void {
        entity.getComponent(MeshComponent) && this.meshes.push(entity.getComponent(MeshComponent)!);
    }
}