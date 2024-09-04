uniform float uSize;
uniform float uTime;

attribute float aScale;

#include <fog_pars_vertex>

void main()
{
    /**
     * Position
     */
    #include <begin_vertex>
    #include <project_vertex>
    #include <fog_vertex>

    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    modelPosition.x += sin(uTime + aScale) / aScale;
    modelPosition.y += sin(uTime + aScale) / aScale;
    modelPosition.z += sin(uTime + aScale) / aScale;

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    /**
     * Size
     */
    gl_PointSize = aScale / -viewPosition.z;
}