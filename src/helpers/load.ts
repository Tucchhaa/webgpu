const SHADERS_LOCATION = 'src/shaders';

export const loadShader = async (shaderName: string): Promise<string> => {
    const response = await fetch(`${SHADERS_LOCATION}/${shaderName}.wgsl`);

    const shader = await response.text();

    return shader;
}
