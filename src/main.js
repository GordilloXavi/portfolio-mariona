import * as THREE from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import { Timer } from 'three/addons/misc/Timer.js'
import GUI from 'lil-gui'
import Stats from 'stats.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

import {makeItGrain} from "./Grain.js"
import pathVertexShader from './shaders/particle_path/vertex.glsl'
import pathFragmentShader from './shaders/particle_path/fragment.glsl'


// Debug
const gui = new GUI()
gui.close()

// Canvas
const canvas = document.querySelector('canvas.webgl')
/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

/**
 * Camera
 */

const cameraControlParams = {
    pointerEnabled: false,
    movementSpeed: 18,
    sprintingMovementSpeed: 27,
    velocityDecay: 0.1,
    initialX: 2,
    initialY: 0.85,
    initialZ: -2,
    movementCounter: 0,
    footstepAmplitude: 80,
    footstepFreq: 1.2,
    clickDistance: 4
}

const camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 0.1, 500)
camera.position.x = cameraControlParams.initialX
camera.position.y = cameraControlParams.initialY
camera.position.z = cameraControlParams.initialZ
camera.lookAt(0, 0.8, 0)

makeItGrain( THREE, camera ) // THIS ADDS GRAIN

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
})
renderer.shadowMap.enabled = true
renderer.colorSpace = THREE.SRGBColorSpace

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// Scene
const scene = new THREE.Scene()

// Fog
const fog = new THREE.FogExp2(0x000000, 0.07)
scene.fog = fog
gui.add(fog, 'density', 0, 0.6).name('fog density')

// Initialize stats to show FPS

const statsOptions = {
    showStats: false,
}
const stats = new Stats()
document.body.appendChild(stats.dom)
if (!statsOptions.showStats) stats.dom.style.display = 'none'

gui.add(statsOptions, 'showStats').name('show FPS').onChange((value) => {
    stats.dom.style.display = value ? 'block' : 'none'
})

// Raycaster
const raycaster = new THREE.Raycaster()

// ###### Scene

// Audio 
const audioListener = new THREE.AudioListener()
camera.add( audioListener )

const positionalSound = new THREE.PositionalAudio(audioListener)
const positionalSound2 = new THREE.PositionalAudio(audioListener)

const audioContext = audioListener.context
const lowpassFilter = audioContext.createBiquadFilter()
lowpassFilter.type = 'lowpass'
lowpassFilter.frequency.setValueAtTime(100, audioContext.currentTime) // Set cutoff frequency

let muted = false

// load a sound and set it as the PositionalAudio object's buffer
const audioLoader = new THREE.AudioLoader()

audioLoader.load( 'sounds/dumb_rain.mp3', function( buffer ) {
	positionalSound.setBuffer( buffer )
	positionalSound.setRefDistance( 3.5 )
    // positionalSound.setMaxDistance(1) does not work for some reason
    positionalSound.setRolloffFactor(20)
    positionalSound.setLoop(true)
    positionalSound.setVolume(1)    
})

audioLoader.load( 'sounds/river.mp3', function( buffer ) {
	positionalSound2.setBuffer( buffer )
	positionalSound2.setRefDistance( 3.5 )
    // positionalSound2.setMaxDistance(1) // does not work for some reason
    positionalSound2.setRolloffFactor(20)
    positionalSound2.setLoop(true)
    positionalSound2.setVolume(1)    
})

const footsteps = {
    paths: [
        'sounds/footsteps/left_1.mp3',
        'sounds/footsteps/left_2.mp3',
        'sounds/footsteps/left_3.mp3',
        'sounds/footsteps/right_1.mp3',
        'sounds/footsteps/right_2.mp3',
        'sounds/footsteps/right_3.mp3'
    ],
    audios: [
        new THREE.Audio( audioListener ),
        new THREE.Audio( audioListener ),
        new THREE.Audio( audioListener ),
        new THREE.Audio( audioListener ),
        new THREE.Audio( audioListener ),
        new THREE.Audio( audioListener )
    ],
    currentIndex: 0
}

for (let i = 0; i < footsteps.paths.length; i++) {
    audioLoader.load(footsteps.paths[i], function( buffer ) { 
        footsteps.audios[i].setBuffer( buffer )
        footsteps.audios[i].setLoop(false)
        footsteps.audios[i].setVolume(0.5)
    })
}

// Environment
let looksMeshes = []

// Textures
const textureLoader = new THREE.TextureLoader()
const materialColorTexture = textureLoader.load('textures/kint/color.png')
materialColorTexture.colorSpace = THREE.SRGBColorSpace
materialColorTexture.wrapS = THREE.MirroredRepeatWrapping
materialColorTexture.wrapT = THREE.MirroredRepeatWrapping
materialColorTexture.generateMipmaps = false
materialColorTexture.minFilter = THREE.NearestFilter
materialColorTexture.magFilter = THREE.NearestFilter
materialColorTexture.repeat.set(200, 200)

const materialAOTexture = textureLoader.load('textures/kint/ao.png')
materialAOTexture.wrapS = THREE.MirroredRepeatWrapping
materialAOTexture.wrapT = THREE.MirroredRepeatWrapping
materialAOTexture.generateMipmaps = false
materialAOTexture.repeat.set(200, 200)

const materialHeightTexture = textureLoader.load('textures/kint/height.png')
materialHeightTexture.wrapS = THREE.MirroredRepeatWrapping
materialHeightTexture.wrapT = THREE.MirroredRepeatWrapping
materialHeightTexture.generateMipmaps = false
materialHeightTexture.repeat.set(200, 200)

const materialNormalTexture = textureLoader.load('textures/kint/normal.png')
materialNormalTexture.wrapS = THREE.MirroredRepeatWrapping
materialNormalTexture.wrapT = THREE.MirroredRepeatWrapping
materialNormalTexture.generateMipmaps = false
materialNormalTexture.repeat.set(200, 200)

const materialRoughnessTexture = textureLoader.load('textures/kint/roughness.png')
materialRoughnessTexture.wrapS = THREE.MirroredRepeatWrapping
materialRoughnessTexture.wrapT = THREE.MirroredRepeatWrapping
materialRoughnessTexture.generateMipmaps = false
materialRoughnessTexture.repeat.set(200, 200)

const materialMetalnessTexture = textureLoader.load('textures/kint/metalness.png')
materialMetalnessTexture.wrapS = THREE.MirroredRepeatWrapping
materialMetalnessTexture.wrapT = THREE.MirroredRepeatWrapping
materialMetalnessTexture.generateMipmaps = false
materialMetalnessTexture.repeat.set(200, 200)

//* Floor material
const marbleMaterial = new THREE.MeshStandardMaterial({
    //color: 0x555555,
    map: materialColorTexture,
    aoMap: materialAOTexture,
    //roughnessMap: materialRoughnessTexture, // activate for some cool visual effects
    roughness: 0.23,
    metalness: 0.85,
    //metalnessMap: materialMetalnessTexture,
    normalMap: materialNormalTexture,
    //displacementMap: materialHeightTexture,
    //displacementBias: 0,
    //displacementScale: 0
})
const floorGUIFolder = gui.addFolder('floor')
floorGUIFolder.close()
floorGUIFolder.add(marbleMaterial, 'wireframe')
floorGUIFolder.add(marbleMaterial, 'roughness', 0, 1)
floorGUIFolder.add(marbleMaterial, 'metalness', 0, 1)

const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100, 10, 10),
    marbleMaterial
)
floor.rotateX(-Math.PI/2)
floor.receiveShadow = true
scene.add(floor)

// ### LOOKS GROUPS ###
const look1Group = new THREE.Group()

const look2Group = new THREE.Group()
look2Group.position.set(25, 0, 33)

const look3Group = new THREE.Group()
look3Group.position.set(3, 0, 0)

const look5Group = new THREE.Group()
look5Group.position.set(-3, 0, 0)

//CRYSTAL PEDESTAL
const pedestalMaterial = new THREE.MeshPhysicalMaterial()
pedestalMaterial.color = new THREE.Color(0x555555)
pedestalMaterial.metalness = 0
pedestalMaterial.roughness = 0.05
pedestalMaterial.transmission = 0.98
pedestalMaterial.ior = 1.6
pedestalMaterial.thickness = 0.1


const pedestal = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.7, 0.5, 100, 100),
    pedestalMaterial
)

pedestal.castShadow = true
pedestal.receiveShadow = true

look2Group.add(pedestal)

/**
 * Lights
 */
const lightsGUIFolder = gui.addFolder( 'lights' )
lightsGUIFolder.close()

// Ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.012)
scene.add(ambientLight)

lightsGUIFolder.add(ambientLight, 'intensity', 0, 3).name('ambient light')

const spotLightTargetObject = new THREE.Object3D()
spotLightTargetObject.position.set(0, 1, 0)
//scene.add(spotLightTargetObject)
look1Group.add(spotLightTargetObject)

const spotLightTargetObject2 = spotLightTargetObject.clone()
look2Group.add(spotLightTargetObject2)

const spotLightColor = 0xddddff
const spotLightR = new THREE.SpotLight(spotLightColor, 2)
lightsGUIFolder.add(spotLightR, 'intensity', 0, 5).name('light 1')

spotLightR.angle = Math.PI / 4
spotLightR.castShadow = true
spotLightR.shadow.mapSize.width = 1024
spotLightR.shadow.mapSize.height = 1024
const shadowBias = -0.01
spotLightR.shadow.bias = shadowBias

spotLightR.shadow.camera.near = 1
spotLightR.shadow.camera.far = 12
spotLightR.shadow.camera.fov = 30
const spotLightRCameraHelper = new THREE.CameraHelper(spotLightR.shadow.camera)
//scene.add(spotLightRCameraHelper)

spotLightR.penumbra = 0.4
spotLightR.position.set(-0.9, 1.4, 0)
spotLightR.target = spotLightTargetObject

//scene.add(spotLightR)
look1Group.add(spotLightR)

const spotLightR2 = spotLightR.clone()
spotLightR2.target = spotLightTargetObject2
look2Group.add(spotLightR2)

const spotLightL = new THREE.SpotLight(spotLightColor, 2)
lightsGUIFolder.add(spotLightL, 'intensity', 0, 5).name('light 2')

spotLightL.angle = Math.PI / 4
spotLightL.castShadow = true
spotLightL.shadow.mapSize.width = 1024
spotLightL.shadow.mapSize.height = 1024
spotLightL.shadow.bias = shadowBias

spotLightL.shadow.camera.near = 1
spotLightL.shadow.camera.far = 12
spotLightL.shadow.camera.fov = 30
const spotLightLCameraHelper = new THREE.CameraHelper(spotLightL.shadow.camera)
//scene.add(spotLightLCameraHelper)

spotLightL.penumbra = 0.4
spotLightL.position.set(0.9, 1.4, 0)
spotLightL.target = spotLightTargetObject

//scene.add(spotLightL)
look1Group.add(spotLightL)

const spotLightL2 = spotLightL.clone()
spotLightL2.target = spotLightTargetObject2
look2Group.add(spotLightL2)

const spotLightF = new THREE.SpotLight(spotLightColor, 2)
lightsGUIFolder.add(spotLightF, 'intensity', 0, 5).name('light 3')

spotLightF.angle = Math.PI / 4
spotLightF.castShadow = true
spotLightF.shadow.mapSize.width = 1024
spotLightF.shadow.mapSize.height = 1024
spotLightF.shadow.bias = shadowBias

spotLightF.shadow.camera.near = 1
spotLightF.shadow.camera.far = 12
spotLightF.shadow.camera.fov = 30
const spotLightFCameraHelper = new THREE.CameraHelper(spotLightF.shadow.camera)
//scene.add(spotLightFCameraHelper)

spotLightF.penumbra = 0.4
spotLightF.position.set(0, 1.4, 0.9)
spotLightF.target = spotLightTargetObject

//scene.add(spotLightF)
look1Group.add(spotLightF)
const spotLightF2 = spotLightF.clone()
spotLightF2.target = spotLightTargetObject2
look2Group.add(spotLightF2)

const spotLightB = new THREE.SpotLight(spotLightColor, 2)
lightsGUIFolder.add(spotLightB, 'intensity', 0, 5).name('light 4')

spotLightB.angle = Math.PI / 4
spotLightB.castShadow = true
spotLightB.shadow.mapSize.width = 1024
spotLightB.shadow.mapSize.height = 1024
spotLightB.shadow.bias = shadowBias

spotLightB.shadow.camera.near = 1
spotLightB.shadow.camera.far = 12
spotLightB.shadow.camera.fov = 30
const spotLightBCameraHelper = new THREE.CameraHelper(spotLightB.shadow.camera)
//scene.add(spotLightBCameraHelper)

spotLightB.penumbra = 0.4
spotLightB.position.set(0, 1.4, -0.9)
spotLightB.target = spotLightTargetObject

//scene.add(spotLightB)
look1Group.add(spotLightB)

const spotLightB2 = spotLightB.clone()
spotLightB2.target = spotLightTargetObject2
look2Group.add(spotLightB2)

let model
const gltf_loader = new GLTFLoader()
gltf_loader.load('/models/look_2_pose_1.glb', function(gltf) { 
    model = gltf.scene

    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true
            const geometry = child.geometry
            geometry.computeVertexNormals() // Calculate normals
        }
    })

    model.position.set(0, 0.4, 0)
    model.rotateY(Math.PI)

    model.add(positionalSound)
    look1Group.add(model)
    looksMeshes.push(model)
})

gltf_loader.load('/models/look_3_pose_2.glb', function(gltf) { 
    model = gltf.scene

    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true
            const geometry = child.geometry
            geometry.computeVertexNormals() // Calculate normals
        }
    })
    model.scale.set(2, 2, 2)
    model.position.set(0, 0.33, 0)
    model.rotateY(Math.PI)

    model.add(positionalSound2)
    look2Group.add(model)
    looksMeshes.push(model)
})

gltf_loader.load('/models/look_4_pose_1.glb', function(gltf) { 
    model = gltf.scene

    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true
        }
    })
    model.scale.set(1.2, 1.2, 1.2)
    model.position.set(0, -1.05, 0)
    look3Group.add(model)
    looksMeshes.push(model)
})

gltf_loader.load('/models/look_5_pose_1.glb', function(gltf) { 
    model = gltf.scene

    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true
        }
    })
    model.scale.set(1, 1, 1)
    model.position.set(0, -0.055, 0)
    look5Group.add(model)
    looksMeshes.push(model)
})

gltf_loader.load('/models/studio_light.glb', function(gltf) {
    const positions = [
        new THREE.Vector3(-1.2, 0, 0),
        new THREE.Vector3(0, 0, 1.2),
        new THREE.Vector3(1.2, 0, 0),
        new THREE.Vector3(0, 0, -1.2),
    ]
    model = gltf.scene
    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true
            child.material.emissive.set(spotLightColor)
        }
    })

    model.scale.set(0.5, 0.5, 0.5)
    model.rotateY(Math.PI/2)

    for (let i = 0; i < positions.length; i++) {
        const modelClone = model.clone()
        modelClone.position.copy(positions[i])
        modelClone.rotateY(Math.PI / 2 * i)
        look1Group.add(modelClone)
        look2Group.add(modelClone.clone())
    }
})


gltf_loader.load('/models/pedestal.glb', function(gltf) {
    model = gltf.scene
    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true
            child.material.color = new THREE.Color(0xeeeeee)
        }
    })

    model.scale.set(0.25, 0.145, 0.25)
    look1Group.add(model)
})

scene.add(look1Group)
scene.add(look2Group)
//scene.add(look3Group)
//scene.add(look5Group)


// Paths between looks
const particlePathParams = {
    density: 10,
    color: new THREE.Color(0xffffff),
    size: 10,
    distanceFromModel: 2
}

function randomNormal(mean = 0, standardDeviation = 1) {
    let u1 = Math.random();
    let u2 = Math.random();
    
    // Box-Muller transform
    let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    
    // Adjust for mean and standard deviation
    return z0 * standardDeviation + mean;
}

let particlePathMaterial = null
const createParticlePath = (position1, position2) => {
    const distance = position1.distanceTo(position2)
    const particleCount = Math.floor(particlePathParams.density * distance)

    const geometry = new THREE.BufferGeometry()

    const positions = new Float32Array(particleCount * 3)
    const scales = new Float32Array(particleCount)

    for(let i = 0; i < particleCount; i++)
    {
        //const d = particlePathParams.distanceFromModel
        //let destinationDirection = new THREE.Vector3(position2.x - position1.x, position2.y - position1.y, position2.z - position1.z)
        //let originDirection = new THREE.Vector3(position1.x - position2.x, position1.y - position2.y, position1.z - position2.z)
        //destinationDirection.normalize()
        //originDirection.normalize()

        const origin = new THREE.Vector3(position1.x, position1.y, position1.z)
        const destination = new THREE.Vector3(position2.x, position2.y, position2.z)

        const i3 = i * 3
        let x = origin.x + Math.random() * (origin.x - destination.x)
        const distanceProportion =  x / (origin.x - destination.x)
        let y = origin.y + (origin.y - destination.y) * distanceProportion + cameraControlParams.initialY / 1.7
        let z = origin.z + (origin.z - destination.z) * distanceProportion

        x = -x + randomNormal(0, 0.1)
        y = y + randomNormal(0, 0.1)
        z = -z + randomNormal(0, 0.1)

        const particlePosition = new THREE.Vector3(x, y, z)
        // FIXME / TODO: this is an awful way to make the particles near the groups disappear. 
        if (particlePosition.distanceTo(origin) < particlePathParams.distanceFromModel || particlePosition.distanceTo(destination) < particlePathParams.distanceFromModel) {
            y = -1
        }

        positions[i3] = x
        positions[i3 + 1] = y
        positions[i3 + 2] = z

        // Set scale
        scales[i] = (particlePathParams.size + (0.5 - Math.random()) * particlePathParams.size) * renderer.getPixelRatio() / 2
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1))

    particlePathMaterial = new THREE.ShaderMaterial({
        depthWrite: true,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        vertexShader: pathVertexShader,
        fragmentShader: pathFragmentShader,
        uniforms: {
            uSize: {value: particlePathParams.size},
            uTime: {value: 0}
        },
        
    })
    return new THREE.Points(geometry, particlePathMaterial)
}

let path = createParticlePath(look1Group.position, look2Group.position)
scene.add(path)

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

    effectComposer.setSize(sizes.width, sizes.height)
    effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})


// Controls
const controlsGUIFolder = gui.addFolder('controls')
controlsGUIFolder.close()

let moveForward = false
let moveBackward = false
let moveLeft = false
let moveRight = false
let sprinting = false
const velocity = new THREE.Vector3()
const direction = new THREE.Vector3()

controlsGUIFolder.add(cameraControlParams, 'pointerEnabled').name('pointer enabled').onChange(() => {
    const pointer = document.getElementById('FPSPointer')
    pointer.style.display = cameraControlParams.pointerEnabled ? 'block' : 'none'
})
controlsGUIFolder.add(cameraControlParams, 'movementSpeed', 1, 150).name('movement speed')
controlsGUIFolder.add(cameraControlParams, 'velocityDecay', 0.01, 5)
controlsGUIFolder.add(cameraControlParams, 'footstepAmplitude', 0, 100).name('footsteps amplitude')
controlsGUIFolder.add(cameraControlParams, 'footstepFreq', 0, 10).name('footsteps speed')
controlsGUIFolder.add(cameraControlParams, 'initialY', 0, 1.50).name('camera height')

const controls = new PointerLockControls( camera, document.body )
controls.pointerSpeed = 0.8
controlsGUIFolder.add(controls, 'pointerSpeed', 0.25, 5).name('sensitivity')


const blocker = document.getElementById( 'blocker' )
const instructions = document.getElementById( 'instructions' )

instructions.addEventListener( 'click', function () {
    controls.lock()
} )

controls.addEventListener( 'lock', function () {
    instructions.style.display = 'none'
    blocker.style.display = 'none'
    gui.hide()

    if (!muted) {
        positionalSound.play()
        positionalSound2.play()
    }
    positionalSound.setFilter(null)
    positionalSound2.setFilter(null)

    positionalSound.setVolume(1)
    positionalSound2.setVolume(1)

    for (let i = 0; i < footsteps.audios.length; i++) footsteps.audios[i].setFilter(null)
} )

controls.addEventListener( 'unlock', function () {
    blocker.style.display = 'block'
    instructions.style.display = ''
    gui.show()
    positionalSound.setFilter(lowpassFilter)
    positionalSound2.setFilter(lowpassFilter)

    positionalSound.setVolume(0.1)
    positionalSound2.setVolume(0.1)

    for (let i = 0; i < footsteps.audios.length; i++) footsteps.audios[i].setFilter(lowpassFilter)
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
        
        case 'ShiftRight':
        case 'ShiftLeft':
            sprinting = true
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

        case 'ShiftRight':
        case 'ShiftLeft':
            sprinting = false
            break
    }
}

const onKeyPress = function (event) {
    if (event.code === 'KeyF') {
        if (!document.fullscreenElement) {
            canvas.requestFullscreen()
            controls.lock()
        } else {
            document.exitFullscreen()
        }
    }
    else if (event.code === 'KeyM') {
        if (positionalSound.isPlaying) {
            positionalSound.pause()
            positionalSound2.pause()
            muted = true
        } else {
            positionalSound.play()
            positionalSound2.play()
            muted = false
        }
    }
}

document.addEventListener( 'keydown', onKeyDown )
document.addEventListener( 'keyup', onKeyUp )
document.addEventListener( 'keypress', onKeyPress)


document.addEventListener('click', () => {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)
    const intersections = raycaster.intersectObjects(looksMeshes).filter(intersect => intersect.distance <= cameraControlParams.clickDistance)
    if (controls.isLocked && intersections.length) {
        const url = 'https://www.instagram.com/mariona.urgell/'
        window.open(url, '_blank')
    }
})

// POST-PROCESSING
renderer.physicallyCorrectLights = true
lightsGUIFolder.add(renderer, 'physicallyCorrectLights').name('physically correct lighting')
const effectComposer = new EffectComposer(renderer)
effectComposer.setSize(sizes.width, sizes.height)
effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
effectComposer.addPass(new RenderPass(scene, camera))

const unrealBloomPass = new UnrealBloomPass()

const bloomGUIFolder = gui.addFolder('bloom')
bloomGUIFolder.close()

let postprocessingParams = {
    enabled: true,
    threshold: 0.05,
    closeThreshold: 0.7,
    strength: 0.82,
    closeStrength: 0.28,
    radius: 0.2,
    closeRadius: 1.2,
    distanceBloomAtenuation: 10,
    closeDistanceBloom: 5.5
}

unrealBloomPass.strength = postprocessingParams.strength
unrealBloomPass.radius = postprocessingParams.radius
unrealBloomPass.threshold = postprocessingParams.threshold

bloomGUIFolder.add(postprocessingParams, 'enabled')
bloomGUIFolder.add(postprocessingParams, 'strength', 0, 2).name('bloom strenght far')
bloomGUIFolder.add(postprocessingParams, 'radius', 0, 2).name('bloom radius far')
bloomGUIFolder.add(postprocessingParams, 'threshold', 0, 2).name('bloom threshold far')
bloomGUIFolder.add(postprocessingParams, 'closeStrength', 0, 2).name('bloom strenght close')
bloomGUIFolder.add(postprocessingParams, 'closeRadius', 0, 2).name('bloom radius close')
bloomGUIFolder.add(postprocessingParams, 'closeThreshold', 0, 2).name('bloom threshold close')
bloomGUIFolder.add(postprocessingParams, 'distanceBloomAtenuation', 0, 50).name('bloom far distance')
bloomGUIFolder.add(postprocessingParams, 'closeDistanceBloom', 0, 10).name('bloom near distance')

effectComposer.addPass(unrealBloomPass)

const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader)
effectComposer.addPass(gammaCorrectionPass)

// Antialias
if(renderer.getPixelRatio() == 1 ) // && !renderer.capabilities.isWebGL2
    {
        const smaaPass = new SMAAPass()
        effectComposer.addPass(smaaPass)
    }

const timer = new Timer()

const tick = () =>
{
    stats.begin()
    // Timer
    timer.update()

    const frameElapsedTime = timer.getDelta()
    const currentMovementSpeed = sprinting ? cameraControlParams.sprintingMovementSpeed : cameraControlParams.movementSpeed

    // Controls:
    velocity.x -= velocity.x * frameElapsedTime * 1/cameraControlParams.velocityDecay
	velocity.z -= velocity.z * frameElapsedTime * 1/cameraControlParams.velocityDecay

    direction.z = Number( moveForward ) - Number( moveBackward )
	direction.x = Number( moveRight ) - Number( moveLeft )
    direction.normalize()

    if ( moveForward || moveBackward ) velocity.z -= direction.z * frameElapsedTime
    if ( moveLeft || moveRight ) velocity.x -= direction.x * frameElapsedTime

    controls.moveRight( - velocity.x * frameElapsedTime * currentMovementSpeed )
	controls.moveForward( - velocity.z * frameElapsedTime * currentMovementSpeed )

    // Footsteps
    if (moveForward || moveBackward || moveLeft || moveRight) {
        cameraControlParams.movementCounter += frameElapsedTime
        const footstepHeight = Math.sin(-Math.PI/2 + cameraControlParams.movementCounter * (currentMovementSpeed) / cameraControlParams.footstepFreq) / cameraControlParams.footstepAmplitude + 1/cameraControlParams.footstepAmplitude
        if (footstepHeight * cameraControlParams.footstepAmplitude > 1.5) {
            let footstepPlaying = false
            for (let i = 0; i < footsteps.audios.length && !footstepPlaying; i++) footstepPlaying = footsteps.audios[i].isPlaying
            
            if (!footstepPlaying) {
                footsteps.audios[footsteps.currentIndex].play()
                footsteps.currentIndex = (footsteps.currentIndex + 1) % footsteps.audios.length
            }
        }
        camera.position.y = cameraControlParams.initialY + footstepHeight
    } else {
        const footstepHeight = Math.sin(-Math.PI/2 + cameraControlParams.movementCounter * (currentMovementSpeed) / cameraControlParams.footstepFreq) / cameraControlParams.footstepAmplitude + 1/cameraControlParams.footstepAmplitude
        if (footstepHeight > 0.0005) {
            camera.position.y = cameraControlParams.initialY + footstepHeight
            cameraControlParams.movementCounter += frameElapsedTime
        } else{
            cameraControlParams.movementCounter = 0
            camera.position.y = cameraControlParams.initialY
        }
    }

    let closestDistanceToModel = 999999999 // infinity
    for (let i = 0; i < looksMeshes.length; i++) {
        const modelWorldPosition = looksMeshes[i].getWorldPosition(new THREE.Vector3())
        const modelPositionXZ = new THREE.Vector2(modelWorldPosition.x, modelWorldPosition.z)
        const distanceToModel = new THREE.Vector2(camera.position.x, camera.position.z).distanceTo(modelPositionXZ)
        if (distanceToModel < closestDistanceToModel) closestDistanceToModel = distanceToModel
    }

    if (closestDistanceToModel <= postprocessingParams.distanceBloomAtenuation && closestDistanceToModel > postprocessingParams.closeDistanceBloom) {        
        unrealBloomPass.threshold = postprocessingParams.threshold + (postprocessingParams.distanceBloomAtenuation - closestDistanceToModel) * Math.abs((postprocessingParams.threshold - postprocessingParams.closeThreshold) / (postprocessingParams.distanceBloomAtenuation - postprocessingParams.closeDistanceBloom))
        unrealBloomPass.radius = postprocessingParams.radius + (postprocessingParams.distanceBloomAtenuation - closestDistanceToModel) * Math.abs((postprocessingParams.radius - postprocessingParams.closeRadius) / (postprocessingParams.distanceBloomAtenuation - postprocessingParams.closeDistanceBloom))
        unrealBloomPass.strength = postprocessingParams.strength - (postprocessingParams.distanceBloomAtenuation - closestDistanceToModel) * Math.abs((postprocessingParams.strength - postprocessingParams.closeStrength) / (postprocessingParams.distanceBloomAtenuation - postprocessingParams.closeDistanceBloom))

    } else if (closestDistanceToModel <= postprocessingParams.closeDistanceBloom) {
        unrealBloomPass.threshold = postprocessingParams.closeThreshold
        unrealBloomPass.radius = postprocessingParams.closeRadius
        unrealBloomPass.strength = postprocessingParams.closeStrength
    } else {
        unrealBloomPass.threshold = postprocessingParams.threshold
        unrealBloomPass.strength = postprocessingParams.strength
        unrealBloomPass.radius = postprocessingParams.radius
    }


    // Detect raycast collisions
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)
    const intersections = raycaster.intersectObjects(looksMeshes).filter(intersect => intersect.distance <= cameraControlParams.clickDistance)
    if (intersections.length) {
        intersections[0].object.material = new THREE.MeshPhysicalMaterial({
            map: intersections[0].object.material.map,
            clearcoat: 1,
            clearcoatRoughness: 0.1, // Less rough for shinier clearcoat
        })

    } else {
        for (let i = 0; i < looksMeshes.length; i++) {
            looksMeshes[i].traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshLambertMaterial({
                        map: child.material.map,
                    })
                }
            })
        }
    }

    // Adjust floor metalness
    const group12Distance = look1Group.position.distanceTo(look2Group.position) 
    const distanceBasedMetalness = (Math.max(group12Distance/2 ,camera.position.distanceTo(look2Group.position)) -  group12Distance/2) / group12Distance * 2
    floor.material.metalness = Math.min(0.85, distanceBasedMetalness)

    // Update time uniforms
    if (particlePathMaterial != null) {
        particlePathMaterial.uniforms.uTime.value = timer.getElapsed()
    }
    

    // Render
    if (postprocessingParams.enabled) {
        effectComposer.render()
    } else {
        renderer.render(scene,camera)
    }

    stats.end()
    window.requestAnimationFrame(tick)
}

tick()