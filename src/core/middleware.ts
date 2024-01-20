export type MiddlewareFn<TData> = (data: TData, next: () => Promise<void>) => Promise<void>;

export interface Middleware<TData> {
    handle(data: TData, next: () => Promise<void>): Promise<void>;
}

export class EventPipeline<TData> {
    private readonly pipeline: MiddlewareFn<TData>[]; 
    
    constructor() {
        this.pipeline = [];
    }

    use(middleware: Middleware<TData>): EventPipeline<TData>;
    use(middleware: MiddlewareFn<TData>): EventPipeline<TData>;
    use(middleware: Middleware<TData> | MiddlewareFn<TData>): EventPipeline<TData> {
        const handler = typeof middleware === "function" 
            ? middleware : middleware.handle;

        this.pipeline.push(handler);

        return this;
    }

    emit(data: TData): Promise<TData> {
        let pipelineIndex = 0;

        const pipelinePromise = new Promise<TData>(async (resolve, reject) => {
            const next = async () => {
                const func = this.pipeline[pipelineIndex];
                pipelineIndex++;
    
                if(func === undefined)
                    return;

                try {
                    await func(data, next);
                } catch(err) {
                    reject(err);
                }
            };

            await next();
            
            resolve(data);
        });

        return pipelinePromise;
    }
}
