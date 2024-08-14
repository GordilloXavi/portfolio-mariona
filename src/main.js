import * as THREE from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
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
gltf_loader.load('/models/look_1_leg.glb', function(gltf) {

    model = gltf.scene;
    model.scale.set(2, 2, 2)
    model.position.set(0, -0.165, 0)
    model.rotateY(Math.PI)

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
camera.position.y = 1
camera.position.z = -3
camera.lookAt(0, 0.5, 0)


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
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const controlParams = {
    movementSpeed: 20,
    velocityDecay: 0.1
}

gui.add(controlParams, 'movementSpeed', 1, 50)
gui.add(controlParams, 'velocityDecay', 0.01, 5)


const controls = new PointerLockControls( camera, document.body );
controls.pointerSpeed = 0.8
gui.add(controls, 'pointerSpeed', 0.25, 5)


const blocker = document.getElementById( 'blocker' );
const instructions = document.getElementById( 'instructions' );

instructions.addEventListener( 'click', function () {
    controls.lock();
} );

controls.addEventListener( 'lock', function () {
    instructions.style.display = 'none';
    blocker.style.display = 'none';
} );

controls.addEventListener( 'unlock', function () {
    blocker.style.display = 'block';
    instructions.style.display = '';
} );

scene.add( controls.getObject() );

const onKeyDown = function ( event ) {
    switch ( event.code ) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = true;
            break;

        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = true;
            break;

        case 'ArrowDown':
        case 'KeyS':
            moveBackward = true;
            break;

        case 'ArrowRight':
        case 'KeyD':
            moveRight = true;
            break;
    }
};

const onKeyUp = function ( event ) {
    switch ( event.code ) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = false;
            break;

        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = false;
            break;

        case 'ArrowDown':
        case 'KeyS':
            moveBackward = false;
            break;

        case 'ArrowRight':
        case 'KeyD':
            moveRight = false;
            break;
    }
};

const onKeyPress = function (event) {
    if (event.code === 'KeyF') {
        if (!document.fullscreenElement) {
            canvas.requestFulflscreen();
        } else {
            document.exitFullscreen();
        }
    }
}

document.addEventListener( 'keydown', onKeyDown );
document.addEventListener( 'keyup', onKeyUp );
//document.addEventListener( 'keypress', onKeyPress);



const timer = new Timer()

const tick = () =>
{
    stats.begin()
    // Timer
    timer.update()
    const elapsedTime = timer.getDelta()

    velocity.x -= velocity.x * elapsedTime * 1/controlParams.velocityDecay;
	velocity.z -= velocity.z * elapsedTime * 1/controlParams.velocityDecay;

    // Movement:
    direction.z = Number( moveForward ) - Number( moveBackward )
	direction.x = Number( moveRight ) - Number( moveLeft )
    direction.normalize()

    if ( moveForward || moveBackward ) velocity.z -= direction.z * elapsedTime;
    if ( moveLeft || moveRight ) velocity.x -= direction.x * elapsedTime;

    controls.moveRight( - velocity.x * elapsedTime * controlParams.movementSpeed );
	controls.moveForward( - velocity.z * elapsedTime * controlParams.movementSpeed );


    // Render
    renderer.render(scene, camera)

    stats.end()
    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()