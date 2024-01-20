import { Quat, Vec3 } from "wgpu-matrix";
import { EntityComponent } from "./components/entity-component";
import { Transform, TransformConfig } from "./components/transform";

export interface SpaceEntityConfig {
    transform?: TransformConfig;

    components?: EntityComponent[];
}

export type EntityComponentType<T extends EntityComponent> = new (...args: any[]) => T;

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
        
        // === Components
        this.addComponent(this.transform);

        for(const component of config.components ?? []) {
            this.addComponent(component);
        }
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

    public getComponents<T extends EntityComponent>(componentType: EntityComponentType<T>): T[] {
        const result: T[] = [];

        for(const componentId in this.components) {
            const component = this.components[componentId];

            if(component instanceof componentType)
                result.push(component);
        }

        return result;
    }

    public getComponent<T extends EntityComponent>(componentType: EntityComponentType<T>): T | null {
        const components = this.getComponents(componentType);

        return components[0] || null;
    }

    public requireComponent<T extends EntityComponent>(componentType: EntityComponentType<T>): T {
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

    public translate(vector: Vec3, transform?: Transform): void {
        this.transform.translate(vector, transform);
    }

    public rotate(rotation: Quat, transform?: Transform): void {
        this.transform.rotate(rotation, transform);
    }

    public scaleBy(scale: Vec3): void {
        this.transform.scaleBy(scale);
    }
}
