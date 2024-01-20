import { Mat4, Quat, Vec3, mat4, quat, vec3, vec4 } from "wgpu-matrix";
import { EntityComponent } from "./components/entity-component";
import { Transform, TransformConfig } from "./components/transform";

export interface SpaceEntityConfig {
    transform?: TransformConfig;
}

export type EntityComponentType = new (...args: any[]) => EntityComponent;

export class SpaceEntity {
    private static _lastEntityID = -1;

    private static generateInstanceID(): number {
        SpaceEntity._lastEntityID++;

        return SpaceEntity._lastEntityID;
    }

    public readonly ID: number;

    private readonly components: { [id: number]: EntityComponent };

    public transform: Transform;

    constructor(config: SpaceEntityConfig) {
        this.ID = SpaceEntity.generateInstanceID();
        this.components = {};

        this.transform = new Transform(config.transform ?? {});
        
        this.components[this.transform.ID] = this.transform;
    }

    // ===
    // Components
    // ===
    public addComponent(component: EntityComponent): void {
        this.components[component.ID] = component;
        
        component.attachTo(this);
    }

    public removeComponent(component: EntityComponent): void {
        delete this.components[component.ID];

        component.removeAttachment();
    }

    public getComponent(componentType: EntityComponentType): EntityComponent | null {
        for(const componentId in this.components) {
            const component = this.components[componentId];

            if(component instanceof componentType) {
                return component;
            }
        }

        return null;
    }

    public requireComponent(componentType: EntityComponentType): EntityComponent {
        const component = this.getComponent(componentType);

        if(component === null) {
            throw new Error('Required component doesn\'t exist');
        }

        return component;
    }

    // === 
    // Transform component aliases
    // ===
    public get position() { return this.transform.position; }
    public set position(value: Vec3) { this.transform.position = value; }

    public get rotation() { return this.transform.rotation; }
    public set rotation(value: Quat) { this.transform.rotation = value; }

    public get scale() { return this.transform.scale; }
    public set scale(value: Vec3) { this.transform.scale = value; }

    public get transformationMatrix() { return this.transform.transformationMatrix; }

    public translate(vector: Vec3): void {
        this.transform.translate(vector);
    }

    public rotate(rotation: Quat): void {
        this.transform.rotate(rotation);
    }

    public scaleBy(scale: Vec3): void {
        this.transform.scaleBy(scale);
    }
}