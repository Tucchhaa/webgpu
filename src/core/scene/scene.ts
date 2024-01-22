import { CameraComponent, MeshComponent } from "../components";
import { DirectLightComponent, PointLightComponent } from "../components/lights/light";
import { SpaceEntity } from "../space-entity";

export class Scene {
    private static _lastSceneID = -1;

    private static generateInstanceID(): number {
        Scene._lastSceneID++;

        return Scene._lastSceneID;
    }

    public readonly ID: number;

    public mainCamera!: CameraComponent;

    public readonly directLights: DirectLightComponent[];

    public readonly pointLights: PointLightComponent[];

    public readonly meshes: MeshComponent[];

    constructor() {
        this.ID = Scene.generateInstanceID();

        this.directLights = [];
        this.pointLights = [];
        this.meshes = [];
    }

    public addSpaceEntity(entity: SpaceEntity): void {
        entity.getComponent(MeshComponent) && this.meshes.push(entity.getComponent(MeshComponent)!);

        entity.getComponent(DirectLightComponent) && this.directLights.push(entity.getComponent(DirectLightComponent)!);

        entity.getComponent(PointLightComponent) && this.pointLights.push(entity.getComponent(PointLightComponent)!);
    }
}