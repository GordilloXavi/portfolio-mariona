import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { Timer } from 'three/addons/misc/Timer.js'
import GUI from 'lil-gui'
import Stats from 'stats.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

/**
 * Base
 */
// Debug
const gui = new GUI()

// Clock
const clock = new THREE.Clock();


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
const ambientLight = new THREE.AmbientLight(0xffffff, 3)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
directionalLight.lookAt(1, -1, 0)
scene.add(directionalLight)


let model
const gltf_loader = new GLTFLoader();
gltf_loader.load('/models/look_1.glb', function(gltf) {

    //const box = new THREE.Box3().setFromObject(model);
    /*
        const center = box.getCenter(new THREE.Vector3());

        // Translate the model so the center of the bounding box is at (0, 0, 0)
        model.position.sub(center);

        // Rotate the model around the X-axis
        model.rotateX(Math.PI / 4);

        // Move the model back to its original position
        model.position.add(center);
        */


    model = gltf.scene;
    model.scale.set(5, 5, 5)
    model.rotateZ(Math.PI/2)
    model.position.set(1.9, 0.56, 0.6)
    model.rotateX(-Math.PI/10)

    const boxHelper = new THREE.BoxHelper(model, 0xffff00); // Yellow bounding box
    scene.add(boxHelper);

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
const gridHelper = new THREE.GridHelper(50, 50); // size = 10 units, divisions = 10
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
const camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 0.1, 500)
camera.position.x = 0
camera.position.y = 0
camera.position.z = -3
camera.lookAt(0, 0, 0);
scene.add(camera)


/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    toneMapping: THREE.NoToneMapping
})

gui.add(renderer, 'toneMapping', {
    No: THREE.NoToneMapping,
    Linear: THREE.LinearToneMapping,
    Reinhard: THREE.ReinhardToneMapping,
    Cineon: THREE.CineonToneMapping,
    ACESFilmic: THREE.ACESFilmicToneMapping
})

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))


// Controls
const controls = new OrbitControls(camera, canvas)

const timer = new Timer()

const tick = () =>
{
    stats.begin()
    // Timer
    timer.update()
    const elapsedTime = timer.getElapsed()

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    stats.end()
    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()