import * as THREE from 'three'
import { FirstPersonControls } from 'three/examples/jsm/Addons.js';
import { Timer } from 'three/addons/misc/Timer.js'
import GUI from 'lil-gui'
import Stats from 'stats.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

/**
 * Base
 */
// Debug
const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Initialize stats to show FPS
const stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);


/**
 * Lights
 */
// Ambient light
const ambientLight = new THREE.AmbientLight(0xaaaaaa, 1)
scene.add(ambientLight)

/*
const loader = new FBXLoader()
loader.load('./models/road.fbx', (object) => {
    console.log("loaded object!!")
    scene.add(object)
}, undefined, (error) => {
    console.error('Error loading FBX model:', error)
})
*/

let model
const gltf_loader = new GLTFLoader();
gltf_loader.load('/models/look_1.glb', function(gltf) {
    model = gltf.scene;
    model.scale.set(5, 5, 5)
    model.rotateZ(Math.PI/2)
    model.position.set(2, 0.5, 0)
    model.rotateX(-Math.PI/10)

    const boxHelper = new THREE.BoxHelper(model, 0xffff00); // Yellow bounding box
    scene.add(boxHelper);

    scene.add(model)
})

gltf_loader.load('/models/krimson_city_sewers/scene.gltf', function(gltf) {
    model = gltf.scene;

    //const boxHelper = new THREE.BoxHelper(model, 0xffff00); // Yellow bounding box
    //scene.add(boxHelper);

    scene.add(model)
})


/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

// Add GridHelper to the scene
const gridHelper = new THREE.GridHelper(10, 10); // size = 10 units, divisions = 10
scene.add(gridHelper);

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 500)
camera.position.x = 0
camera.position.y = 1
camera.position.z = -3
camera.lookAt(0, 0, 0);
scene.add(camera)


/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))


// Controls
const controls = new FirstPersonControls( camera, renderer.domElement );
controls.movementSpeed = 1;
controls.lookSpeed = 0.05;

/**
 * Fog
 */
// scene.fog = new THREE.Fog('#04343f', 1, 13)
// scene.fog = new THREE.FogExp2('#04343f', 0.1)

/**
 * Animate
 */
const timer = new Timer()

const tick = () =>
{
    stats.begin()
    // Timer
    timer.update()
    const elapsedTime = timer.getElapsed()

    // Update controls
    controls.update( elapsedTime/100 );

    // Render
    renderer.render(scene, camera)

    stats.end()
    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()