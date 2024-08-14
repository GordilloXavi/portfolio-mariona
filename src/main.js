import * as THREE from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Timer } from 'three/addons/misc/Timer.js'
import GUI from 'lil-gui'
import Stats from 'stats.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

/**
 * Base
 */
// Debug
const gui = new GUI()

// Clock
const clock = new THREE.Clock()


// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Initialize stats to show FPS
const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)

// Scene
const floorMaterial = new THREE.MeshStandardMaterial(0x555555)
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10, 100, 100),
    floorMaterial
)
floor.rotateX(-Math.PI/2)
floor.receiveShadow = true
scene.add(floor)
gui.add(floorMaterial, 'wireframe')


/**
 * Lights
 */
const lightsGUIFolder = gui.addFolder( 'Lights' );

// Ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.25)
scene.add(ambientLight)

lightsGUIFolder.add(ambientLight, 'intensity', 0, 3)

const spotLightTargetObject = new THREE.Object3D();
spotLightTargetObject.position.set(0, 0.5, 0)
scene.add(spotLightTargetObject)
const spotLightR = new THREE.SpotLight(0xffffff, 3)

spotLightR.angle = Math.PI / 5
spotLightR.castShadow = true;
spotLightR.shadow.mapSize.width = 512
spotLightR.shadow.mapSize.height = 512

spotLightR.shadow.camera.near = 1
spotLightR.shadow.camera.far = 5
spotLightR.shadow.camera.fov = 30
const spotLightRCameraHelper = new THREE.CameraHelper(spotLightR.shadow.camera)
scene.add(spotLightRCameraHelper)

spotLightR.penumbra = 0.4
spotLightR.position.set(-0.9, 1.2, 0)
spotLightR.target = spotLightTargetObject
//const spotLightRHelper = new THREE.SpotLightHelper(spotLightR)

scene.add(spotLightR)
//scene.add(spotLightRHelper)


const spotLightL = new THREE.SpotLight(0xffffff, 3)

spotLightL.angle = Math.PI / 5
spotLightL.castShadow = true
spotLightL.shadow.mapSize.width = 512
spotLightL.shadow.mapSize.height = 512

spotLightL.shadow.camera.near = 1
spotLightL.shadow.camera.far = 5
spotLightL.shadow.camera.fov = 30
const spotLightLCameraHelper = new THREE.CameraHelper(spotLightL.shadow.camera)
scene.add(spotLightLCameraHelper)


spotLightL.penumbra = 0.4
spotLightL.position.set(0.9, 1.2, 0)
spotLightL.target = spotLightTargetObject
//const spotLightLHelper = new THREE.SpotLightHelper(spotLightL)

scene.add(spotLightL)
//scene.add(spotLightLHelper)


let model
const gltf_loader = new GLTFLoader();
gltf_loader.load('/models/look_1_leg.glb', function(gltf) {
    model = gltf.scene

    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true
            const geometry = child.geometry
            geometry.computeVertexNormals() // Calculate normals
        }
    });

    model.scale.set(2, 2, 2)
    model.position.set(0, -0.165, 0)
    model.rotateY(Math.PI)

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
const gridHelper = new THREE.GridHelper(50, 50) // size = 10 units, divisions = 10
scene.add(gridHelper)

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
camera.position.y = 0.8
camera.position.z = -2.5
camera.lookAt(0, 0.5, 0)

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
})
renderer.shadowMap.enabled = true

renderer.toneMapping = THREE.ACESFilmicToneMapping

gui.add(renderer, 'toneMapping', {
    ACESFilmic: THREE.ACESFilmicToneMapping,
    No: THREE.NoToneMapping,
    Linear: THREE.LinearToneMapping,
    Reinhard: THREE.ReinhardToneMapping,
    Cineon: THREE.CineonToneMapping
})

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))


// Controls
const controlsGUIFolder = gui.addFolder('controls')

let moveForward = false
let moveBackward = false
let moveLeft = false
let moveRight = false
const velocity = new THREE.Vector3()
const direction = new THREE.Vector3()
const controlParams = {
    movementSpeed: 20,
    velocityDecay: 0.1
}

controlsGUIFolder.add(controlParams, 'movementSpeed', 1, 50)
controlsGUIFolder.add(controlParams, 'velocityDecay', 0.01, 5)


const controls = new PointerLockControls( camera, document.body )
controls.pointerSpeed = 0.8
controlsGUIFolder.add(controls, 'pointerSpeed', 0.25, 5)


const blocker = document.getElementById( 'blocker' )
const instructions = document.getElementById( 'instructions' )

instructions.addEventListener( 'click', function () {
    controls.lock()
} )

controls.addEventListener( 'lock', function () {
    instructions.style.display = 'none'
    blocker.style.display = 'none'
    gui.hide()
} )

controls.addEventListener( 'unlock', function () {
    blocker.style.display = 'block'
    instructions.style.display = ''
    gui.show()
} )

scene.add( controls.getObject() )

const onKeyDown = function ( event ) {
    switch ( event.code ) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = true
            break

        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = true
            break

        case 'ArrowDown':
        case 'KeyS':
            moveBackward = true
            break

        case 'ArrowRight':
        case 'KeyD':
            moveRight = true
            break
    }
}

const onKeyUp = function ( event ) {
    switch ( event.code ) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = false
            break

        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = false
            break

        case 'ArrowDown':
        case 'KeyS':
            moveBackward = false
            break

        case 'ArrowRight':
        case 'KeyD':
            moveRight = false
            break
    }
}

const onKeyPress = function (event) {
    if (event.code === 'KeyF') {
        if (!document.fullscreenElement) {
            canvas.requestFulflscreen()
        } else {
            document.exitFullscreen()
        }
    }
}

document.addEventListener( 'keydown', onKeyDown )
document.addEventListener( 'keyup', onKeyUp )
//document.addEventListener( 'keypress', onKeyPress)



const timer = new Timer()

const tick = () =>
{
    stats.begin()
    // Timer
    timer.update()
    const elapsedTime = timer.getDelta()

    velocity.x -= velocity.x * elapsedTime * 1/controlParams.velocityDecay
	velocity.z -= velocity.z * elapsedTime * 1/controlParams.velocityDecay

    // Movement:
    direction.z = Number( moveForward ) - Number( moveBackward )
	direction.x = Number( moveRight ) - Number( moveLeft )
    direction.normalize()

    if ( moveForward || moveBackward ) velocity.z -= direction.z * elapsedTime
    if ( moveLeft || moveRight ) velocity.x -= direction.x * elapsedTime

    controls.moveRight( - velocity.x * elapsedTime * controlParams.movementSpeed )
	controls.moveForward( - velocity.z * elapsedTime * controlParams.movementSpeed )


    // Render
    renderer.render(scene, camera)

    stats.end()
    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()