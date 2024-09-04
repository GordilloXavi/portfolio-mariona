#include <fog_pars_fragment>
void main () 
{
    float strength = distance(gl_PointCoord, vec2(0.5));
    strength = max(0.0, 1.0 - strength * 2.0);
    //strength = pow(strength, 10.0);

    gl_FragColor = vec4(vec3(strength*2.0), 1.0);

    #include <fog_fragment>
    #include <colorspace_fragment>
}