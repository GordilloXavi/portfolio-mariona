uniform float uSize;
uniform float uTime;

attribute float aScale;

float random(vec2 co) { // to generate pseudo-random numbers in the vertex shader
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt = dot(co.xy, vec2(a,b));
    highp float sn = mod(dt, 3.14);
    return fract(sin(sn) * c);
}

void main()
{
    /**
     * Position
     */
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