import * as THREE from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import { Timer } from 'three/addons/misc/Timer.js'
import GUI from 'lil-gui'
import Stats from 'stats.js'
import { gsap } from 'gsap'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js'

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
    initialX: 42, // group1: 2 // group2: 27 // group3: 42
    initialY: 0.85,
    initialZ: 58, // group1: -2 // group2: 35 // group3: 58
    movementCounter: 0,
    footstepAmplitude: 80,
    footstepFreq: 1.2,
    clickDistance: 4,
    renderDistance: 500 // default 50
}

const camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 0.1, cameraControlParams.renderDistance)
gui.add(cameraControlParams, 'renderDistance', 10, 500).name('render distance').onChange(() => {
    camera.far = cameraControlParams.renderDistance
    camera.updateProjectionMatrix()
})

camera.position.x = cameraControlParams.initialX
camera.position.y = cameraControlParams.initialY
camera.position.z = cameraControlParams.initialZ
camera.lookAt(40, 0.85, 56) // group1: (0, 0.85, 0) // group3: (40, 0.85, 56)

// Controls
const controls = new PointerLockControls( camera, document.body )


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

// Loading manager, for intro loading screen
const introLoadingManager = new THREE.LoadingManager()


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

// Loading screen
const loadingScreenGeometry = new THREE.PlaneGeometry(2, 2, 1, 1)
const loadingScreenMaterial = new THREE.ShaderMaterial({
    transparent: true,
    vertexShader: `
        void main()
        {
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uAlpha;
        void main()
        {
            gl_FragColor = vec4(0.0, 0.0, 0.0, uAlpha);
        }
    `,
    uniforms:
    {
        uAlpha: { value: 1.0 }
    },
})
const loadingScreen = new THREE.Mesh(loadingScreenGeometry, loadingScreenMaterial)
//scene.add(loadingScreen)

introLoadingManager.onLoad = function ( ) {
	console.log( 'Loading complete!');
    //blocker.style.display = 'block'
    //instructions.style.display = ''
    //gsap.to(loadingScreenMaterial.uniforms.uAlpha, { duration: 3, value: 0 })
}

introLoadingManager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
	//console.log( 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
}

// Audio 
const audioParams = {
    look1SongVolume: 0.6,
    look1Speed: 1,
    look2SongVolume: 0.8,
    look2Speed: 1,
    footstepsVolume: 0.5,
    distanceFactor: 4,
    rolloffFactor: 18,
    menuVolume: 0.1,
}
const audioGUIFolder = gui.addFolder('audio')
audioGUIFolder.close()
audioGUIFolder.add(audioParams, 'menuVolume', 0, 1).name('menu volume')

const audioListener = new THREE.AudioListener()
camera.add( audioListener )

const positionalSound = new THREE.PositionalAudio(audioListener)
const positionalSound2 = new THREE.PositionalAudio(audioListener)

let muted = false

// load a sound and set it as the PositionalAudio object's buffer
const audioLoader = new THREE.AudioLoader(introLoadingManager)

audioLoader.load( 'sounds/dumb_rain.mp3', function( buffer ) {
	positionalSound.setBuffer( buffer )
	positionalSound.setRefDistance( audioParams.distanceFactor )
    // positionalSound.setMaxDistance(1) does not work for some reason
    positionalSound.setRolloffFactor(audioParams.rolloffFactor)
    positionalSound.setLoop(true)
    positionalSound.setVolume(audioParams.look1SongVolume)
    audioGUIFolder.add(audioParams, 'look1SongVolume', 0, 1).name('look 1 music volume').onChange(() => {
        positionalSound.setVolume(audioParams.look1SongVolume)
    })

    audioGUIFolder.add(audioParams, 'look1Speed', 0, 3).name('look 1 playback speed').onChange(() => {
        positionalSound.setPlaybackRate(audioParams.look1Speed)
    })
})

audioLoader.load( 'sounds/river.mp3', function( buffer ) {
	positionalSound2.setBuffer( buffer )
	positionalSound2.setRefDistance( audioParams.distanceFactor )
    // positionalSound2.setMaxDistance(1) // does not work for some reason
    positionalSound2.setRolloffFactor(audioParams.rolloffFactor)
    positionalSound2.setLoop(true)
    positionalSound2.setVolume(audioParams.look2SongVolume)    
    audioGUIFolder.add(audioParams, 'look2SongVolume', 0, 1).name('look 2 music volume').onChange(() => {
        positionalSound2.setVolume(audioParams.look2SongVolume)
    })
    audioGUIFolder.add(audioParams, 'look2Speed', 0, 3).name('look 2 playback speed').onChange(() => {
        positionalSound2.setPlaybackRate(audioParams.look2Speed)
    })
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
        footsteps.audios[i].setVolume(audioParams.footstepsVolume)
    })
}

const audioContext = audioListener.context

// Low pass filter for menu
const lowpassFilter = audioContext.createBiquadFilter()
lowpassFilter.type = 'lowpass'
lowpassFilter.frequency.setValueAtTime(100, audioContext.currentTime) // Set cutoff frequency

// Environment
let looksMeshes = []
let look1 = null
let look2 = null
let look3 = null

// Textures
const textureLoader = new THREE.TextureLoader(introLoadingManager)
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
look3Group.position.set(40, 0, 56)

//CRYSTAL PEDESTAL
const pedestalMaterial = new THREE.MeshPhysicalMaterial()
pedestalMaterial.color = new THREE.Color(0xffffff)
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

const look1LightsGUIFolder = lightsGUIFolder.addFolder('look 1')
look1LightsGUIFolder.close()

// Ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0) // 0.05
scene.add(ambientLight)

lightsGUIFolder.add(ambientLight, 'intensity', 0, 3).name('ambient light')

const spotLightTargetObject = new THREE.Object3D()
spotLightTargetObject.position.set(0, 1, 0)
//scene.add(spotLightTargetObject)
look1Group.add(spotLightTargetObject)

const spotLightColor = 0xddddff
const spotLightR = new THREE.SpotLight(spotLightColor, 2)
look1LightsGUIFolder.add(spotLightR, 'intensity', 0, 5).name('light 1')

spotLightR.angle = Math.PI / 4
spotLightR.castShadow = true
spotLightR.shadow.mapSize.width = 1024
spotLightR.shadow.mapSize.height = 1024
const shadowBias = -0.01
spotLightR.shadow.bias = shadowBias

spotLightR.shadow.camera.near = 1
spotLightR.shadow.camera.far = 12
spotLightR.shadow.camera.fov = 30

spotLightR.penumbra = 0.4
spotLightR.position.set(-0.9, 1.4, 0)
spotLightR.target = spotLightTargetObject

look1Group.add(spotLightR)

const spotLightL = new THREE.SpotLight(spotLightColor, 2)
look1LightsGUIFolder.add(spotLightL, 'intensity', 0, 5).name('light 2')

spotLightL.angle = Math.PI / 4
spotLightL.castShadow = true
spotLightL.shadow.mapSize.width = 1024
spotLightL.shadow.mapSize.height = 1024
spotLightL.shadow.bias = shadowBias

spotLightL.shadow.camera.near = 1
spotLightL.shadow.camera.far = 12
spotLightL.shadow.camera.fov = 30

spotLightL.penumbra = 0.4
spotLightL.position.set(0.9, 1.4, 0)
spotLightL.target = spotLightTargetObject


look1Group.add(spotLightL)


const spotLightF = new THREE.SpotLight(spotLightColor, 2)
look1LightsGUIFolder.add(spotLightF, 'intensity', 0, 5).name('light 3')

spotLightF.angle = Math.PI / 4
spotLightF.castShadow = true
spotLightF.shadow.mapSize.width = 1024
spotLightF.shadow.mapSize.height = 1024
spotLightF.shadow.bias = shadowBias

spotLightF.shadow.camera.near = 1
spotLightF.shadow.camera.far = 12
spotLightF.shadow.camera.fov = 30

spotLightF.penumbra = 0.4
spotLightF.position.set(0, 1.4, 0.9)
spotLightF.target = spotLightTargetObject

look1Group.add(spotLightF)


const spotLightB = new THREE.SpotLight(spotLightColor, 2)
look1LightsGUIFolder.add(spotLightB, 'intensity', 0, 5).name('light 4')

spotLightB.angle = Math.PI / 4
spotLightB.castShadow = true
spotLightB.shadow.mapSize.width = 1024
spotLightB.shadow.mapSize.height = 1024
spotLightB.shadow.bias = shadowBias

spotLightB.shadow.camera.near = 1
spotLightB.shadow.camera.far = 12
spotLightB.shadow.camera.fov = 30

spotLightB.penumbra = 0.4
spotLightB.position.set(0, 1.4, -0.9)
spotLightB.target = spotLightTargetObject


look1Group.add(spotLightB)

const gltf_loader = new GLTFLoader(introLoadingManager)
gltf_loader.load('/models/look_2_pose_1.glb', function(gltf) { 
    look1 = gltf.scene

    look1.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true
            const geometry = child.geometry
            geometry.computeVertexNormals() // Calculate normals
        }
    })

    look1.position.set(0, 0.4, 0)
    look1.rotateY(Math.PI)

    look1.add(positionalSound)
    look1Group.add(look1)
    looksMeshes.push(look1)
})

gltf_loader.load('/models/studio_light.glb', function(gltf) {
    const positions = [
        new THREE.Vector3(-1.2, 0, 0),
        new THREE.Vector3(0, 0, 1.2),
        new THREE.Vector3(1.2, 0, 0),
        new THREE.Vector3(0, 0, -1.2),
    ]
    const model = gltf.scene
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
    }
})

gltf_loader.load('/models/pedestal.glb', function(gltf) {
    const model = gltf.scene
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

// Look 2 Group

// Model: 
gltf_loader.load('/models/look_1.glb', function(gltf) { 
    look2 = gltf.scene

    look2.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true
            const geometry = child.geometry
            geometry.computeVertexNormals() // Calculate normals
        }
    })
    look2.scale.set(1, 1, 1)
    look2.position.set(0, 0.33, 0)
    look2.rotateY(Math.PI)

    look2.add(positionalSound2)
    look2Group.add(look2)
    looksMeshes.push(look2)
})

// Lights:
const look2LightsGUIFolder = lightsGUIFolder.addFolder('look 2')
look2LightsGUIFolder.close()

const look2LightsUpGUIFolder = look2LightsGUIFolder.addFolder('upper light')
look2LightsUpGUIFolder.close()


const look2LightsFrontGUIFolder = look2LightsGUIFolder.addFolder('front lights')
look2LightsFrontGUIFolder.close()


const look2SpotLightUpParams = {
    height: 2.76,
    intensity: 15.7,
    penumbra: 0.45,
    angle: 0.42
}

const look2DirectionaLightsParams = {
    intensity: 1.52,
    height: 65
}

const look2spotLightColor = 0xffffff
const look2SpotLightUp = new THREE.SpotLight(look2spotLightColor, look2SpotLightUpParams.intensity)

look2SpotLightUp.angle = look2SpotLightUpParams.angle
look2SpotLightUp.castShadow = true
look2SpotLightUp.shadow.mapSize.width = 256
look2SpotLightUp.shadow.mapSize.height = 256

look2SpotLightUp.shadow.bias = shadowBias

look2SpotLightUp.shadow.camera.near = 1
look2SpotLightUp.shadow.camera.far = look2SpotLightUpParams.height + 0.1
look2SpotLightUp.shadow.camera.fov = 20

look2SpotLightUp.penumbra = look2SpotLightUpParams.penumbra
look2SpotLightUp.position.set(0, look2SpotLightUpParams.height, 0)

look2SpotLightUp.target = pedestal

look2LightsUpGUIFolder.add(look2SpotLightUpParams, 'intensity', 0, 50).name('intensity').onChange(() => {look2SpotLightUp.intensity = look2SpotLightUpParams.intensity})
look2LightsUpGUIFolder.add(look2SpotLightUpParams, 'penumbra', 0, 1).name('penumbra').onChange(() => {look2SpotLightUp.penumbra = look2SpotLightUpParams.penumbra})
look2LightsUpGUIFolder.add(look2SpotLightUpParams, 'angle', 0, Math.PI/2).name('angle').onChange(() => {look2SpotLightUp.angle = look2SpotLightUpParams.angle})
look2LightsUpGUIFolder.add(look2SpotLightUpParams, 'height', 0, 5).name('height').onChange(() => {look2SpotLightUp.position.y = look2SpotLightUpParams.height})

look2Group.add(look2SpotLightUp)

// Directional lights
const look2SpotDirectionalLight1 = new THREE.DirectionalLight(0xffffff, look2DirectionaLightsParams.intensity)
const look2SpotDirectionalLight2 = new THREE.DirectionalLight(0xffffff, look2DirectionaLightsParams.intensity)

look2SpotDirectionalLight1.position.set(100, -look2DirectionaLightsParams.height, 100) 
look2SpotDirectionalLight2.position.set(-100, -look2DirectionaLightsParams.height, -100) 

look2LightsFrontGUIFolder.add(look2DirectionaLightsParams, 'intensity', 0, 20).name('intensity').onChange(() => {
    look2SpotDirectionalLight1.intensity = look2DirectionaLightsParams.intensity
    look2SpotDirectionalLight2.intensity = look2DirectionaLightsParams.intensity
})
look2LightsFrontGUIFolder.add(look2DirectionaLightsParams, 'height', 0, 100).name('depth').onChange(() => {
    look2SpotDirectionalLight1.position.y = -look2DirectionaLightsParams.height
    look2SpotDirectionalLight2.position.y = -look2DirectionaLightsParams.height
})

look2Group.add(look2SpotDirectionalLight1)
look2Group.add(look2SpotDirectionalLight2)

scene.add(look2Group)


// Look 3 group:
// Models: 
gltf_loader.load('/models/look_5_pose_1.glb', function(gltf) {  //look_2_pose_1 look_5_pose_1
    look3 = gltf.scene

    look3.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true
            const geometry = child.geometry
            geometry.computeVertexNormals() // Calculate normals
        }
    })
    look3.scale.set(0.85, 0.85, 0.85)
    look3.position.set(0, -0.04, 0.35)
    look3.rotateY(Math.PI/2)

    //look3.add(positionalSound2)
    look3Group.add(look3)
    looksMeshes.push(look3)
})

let pavementFloor = null
gltf_loader.load('/models/cracked_pavement/scene.gltf', function(gltf) { 
    pavementFloor = gltf.scene

    pavementFloor.traverse((child) => {
        if (child.isMesh) {
            child.receiveShadow = true
            child.geometry.computeVertexNormals()
        }
    })
    pavementFloor.scale.set(4, 4, 4)

    look3Group.add(pavementFloor)
})

let fan = null
let mixer = null
gltf_loader.load('/models/fan/scene.gltf', function(gltf) { 
    fan = gltf.scene

    fan.traverse((child) => {
        if (child.isMesh) {
            child.geometry.computeVertexNormals()
            child.material = new THREE.MeshBasicMaterial({map: child.material.map})
            child.material.color.set(0x444444)
        }
    })
    fan.scale.set(0.5, 0.5, 0.5)
    fan.position.set(0, 1.9, 0)
    look3Group.add(fan)

    // Set up the AnimationMixer for the model
    mixer = new THREE.AnimationMixer(fan)

    // Extract the animations from the loaded model
    const animations = gltf.animations

    // Play the first animation (assuming it exists)
    if (animations && animations.length > 0) {
        const action = mixer.clipAction(animations[0]); // Get the first animation
        action.play()  // Start the animation
    }
})

// Fan light
// Geometry for the half-sphere
const geometry = new THREE.SphereGeometry(0.07, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)
const halfSphere = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0xffffdd }))
halfSphere.rotateX(Math.PI)
halfSphere.position.set(0, 1.375, 0)
look3Group.add(halfSphere)

let television = null
gltf_loader.load('/models/tv/scene.gltf', function(gltf) { 
    television = gltf.scene

    television.traverse((child) => {
        if (child.isMesh) {
            child.receiveShadow = true
            child.castShadow = true
            child.geometry.computeVertexNormals()
        }
    })
    television.position.set(3.35, 0, -0.75)
    television.scale.set(0.5, 0.5, 0.5)

    look3Group.add(television)
})

// TV screen
const tvScreenColor = new THREE.Color(0xccffcc)
const tvScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.165),
    new THREE.MeshBasicMaterial({color: tvScreenColor, transparent: true})
)
tvScreen.position.set(-0.097, 0.63, -0.64)

look3Group.add(tvScreen)

// Lights:
const look3LightsGUIFolder = lightsGUIFolder.addFolder('look 3')
look3LightsGUIFolder.close()

const look3LightsGUIFolderFan = look3LightsGUIFolder.addFolder('fan light')
look3LightsGUIFolderFan.close()

const look3LightsGUIFolderTV = look3LightsGUIFolder.addFolder('TV light')
look3LightsGUIFolderTV.close()

// Fan light
const look3SpotLightUpParams = {
    height: 1.4,
    intensity: 7,
    penumbra: 1,
    angle: 0.97
}

const look3SpotLightUp = new THREE.SpotLight(0xffffff, look3SpotLightUpParams.intensity)

look3SpotLightUp.angle = look3SpotLightUpParams.angle
look3SpotLightUp.castShadow = true
look3SpotLightUp.shadow.mapSize.width = 1024
look3SpotLightUp.shadow.mapSize.height = 1024

look3SpotLightUp.shadow.camera.near = 0.1
look3SpotLightUp.shadow.camera.far = look3SpotLightUpParams.height + 0.01
look3SpotLightUp.shadow.camera.fov = 20

look3SpotLightUp.penumbra = look3SpotLightUpParams.penumbra
look3SpotLightUp.position.set(0, look3SpotLightUpParams.height, 0)

const look3SpotLightUpTarget = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial())
look3SpotLightUpTarget.visible = false

look3Group.add(look3SpotLightUpTarget)
look3SpotLightUp.target = look3SpotLightUpTarget// = look3SpotLightUpTarget// = 

//const helper = new THREE.CameraHelper(look3SpotLightUp.shadow.camera)
//scene.add(helper)

look3LightsGUIFolderFan.add(look3SpotLightUpParams, 'intensity', 0, 50).name('intensity').onChange(() => {look3SpotLightUp.intensity = look3SpotLightUpParams.intensity})
look3LightsGUIFolderFan.add(look3SpotLightUpParams, 'penumbra', 0, 1).name('penumbra').onChange(() => {look3SpotLightUp.penumbra = look3SpotLightUpParams.penumbra})
look3LightsGUIFolderFan.add(look3SpotLightUpParams, 'angle', 0, Math.PI/2).name('angle').onChange(() => {look3SpotLightUp.angle = look3SpotLightUpParams.angle})
look3LightsGUIFolderFan.add(look3SpotLightUpParams, 'height', 0, 5).name('height').onChange(() => {look3SpotLightUp.position.y = look3SpotLightUpParams.height})

look3Group.add(look3SpotLightUp)

// TV screen light
const look3SpotLightTV = new THREE.SpotLight(tvScreenColor, 30)
look3SpotLightTV.position.set(-0.1, 0.66, -0.66)

look3SpotLightTV.angle = 0.85
look3SpotLightTV.castShadow = true
look3SpotLightTV.shadow.mapSize.width = 512
look3SpotLightTV.shadow.mapSize.height = 512

look3SpotLightTV.shadow.camera.near = 0.1
look3SpotLightTV.shadow.camera.far = 3
look3SpotLightTV.shadow.camera.fov = 20
look3SpotLightTV.penumbra = 1


const look3SpotLightTVTarget = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial())
look3SpotLightTVTarget.position.set(look3SpotLightTV.position.x, look3SpotLightTV.position.y, 0)
look3SpotLightTVTarget.visible = false
look3Group.add(look3SpotLightTVTarget)
look3SpotLightTV.target = look3SpotLightTVTarget

look3Group.add(look3SpotLightTV)

//const look3SpotLightTVHelper = new THREE.SpotLightHelper(look3SpotLightTV)
//scene.add(look3SpotLightTVHelper)

gui.add(look3SpotLightTV.position, 'x', -2,2).onChange(() => {look3SpotLightTVHelper.update()})
gui.add(look3SpotLightTV.position, 'y', -2,2).onChange(() => {look3SpotLightTVHelper.update()})
gui.add(look3SpotLightTV.position, 'z', -2,2).onChange(() => {look3SpotLightTVHelper.update()})

scene.add(look3Group)


// Paths between looks
const particlePathParams = {
    density: 30,
    color: new THREE.Color(0xffffff),
    size: 12,
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
        uniforms: THREE.UniformsUtils.merge( [
            THREE.UniformsLib[ 'fog' ],
            {
                uSize: {value: particlePathParams.size},
                uTime: {value: 0},
            }
        ] ),
        fog: true
    })
    return new THREE.Points(geometry, particlePathMaterial)
}

let pathGroup12 = createParticlePath(look1Group.position, look2Group.position)
scene.add(pathGroup12)


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

    positionalSound.setVolume(audioParams.look1SongVolume)
    positionalSound2.setVolume(audioParams.look2SongVolume)

    for (let i = 0; i < footsteps.audios.length; i++) footsteps.audios[i].setFilter(null)
} )

controls.addEventListener( 'unlock', function () {
    blocker.style.display = 'block'
    instructions.style.display = ''
    gui.show()
    positionalSound.setFilter(lowpassFilter)
    positionalSound2.setFilter(lowpassFilter)

    positionalSound.setVolume(audioParams.menuVolume)
    positionalSound2.setVolume(audioParams.menuVolume)

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
    closeDistanceBloom: 5.5,
    filmGrainIntensity: 0.4,
    grayscale: false
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

// Film grain
const effectFilm = new FilmPass( postprocessingParams.filmGrainIntensity, postprocessingParams.greyscale )
effectComposer.addPass(effectFilm)
bloomGUIFolder.add(postprocessingParams, 'filmGrainIntensity', 0, 5).name('film grain intensity').onChange(() => {effectFilm.uniforms.intensity.value = postprocessingParams.filmGrainIntensity})
bloomGUIFolder.add(postprocessingParams, 'grayscale').onChange(() => {effectFilm.uniforms.grayscale.value = postprocessingParams.grayscale})

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

    // Update bloom in real time, based on distance to model
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

    // Very basic collision detection
    const collisionDistance = 0.4
    const colliding = closestDistanceToModel <= collisionDistance
    if (colliding) {
        // If we are colliding with one of the looks, we cannot move. Therefore, we undo the step that we just did
        controls.moveRight( velocity.x * frameElapsedTime * currentMovementSpeed )
	    controls.moveForward( velocity.z * frameElapsedTime * currentMovementSpeed )
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

    // Adjust floor metalness based on distance to group 2
    const group12Distance = look1Group.position.distanceTo(look2Group.position) 
    const distanceBasedMetalness = (Math.max(group12Distance/2 ,camera.position.distanceTo(look2Group.position)) -  group12Distance/2) / group12Distance * 2
    // floor.material.metalness = Math.min(0.85, distanceBasedMetalness)

    // Adjust group 2 lighting based on distance to group 2
    // from 0 to 1.5
    const look2GroupXZPosition = new THREE.Vector2(look2Group.position.x, look2Group.position.z)
    const cameraXZPosition = new THREE.Vector2(camera.position.x, camera.position.z)
    const distanceToGroup2 = cameraXZPosition.distanceTo(look2GroupXZPosition)

    const closeDistanceIntensity = 4
    const farDistanceIntensity = 12
    if (distanceToGroup2 <= farDistanceIntensity && distanceToGroup2 > closeDistanceIntensity) {        
        const distanceBasedIntensity = 0 + (farDistanceIntensity - distanceToGroup2) * Math.abs((0 - look2DirectionaLightsParams.intensity) / (farDistanceIntensity - closeDistanceIntensity))
        look2SpotDirectionalLight1.intensity = distanceBasedIntensity
        look2SpotDirectionalLight2.intensity = distanceBasedIntensity
    } else if (distanceToGroup2 <= closeDistanceIntensity) {
        look2SpotDirectionalLight1.intensity = look2DirectionaLightsParams.intensity
        look2SpotDirectionalLight2.intensity = look2DirectionaLightsParams.intensity
    } else {
        look2SpotDirectionalLight1.intensity = 0
        look2SpotDirectionalLight2.intensity = 0
    }

    // Group 3 TV flicker
    const decimalPart = ( ( timer.getElapsed() - Math.trunc(timer.getElapsed()) ) * 1000 ) % 10
    const flickerSpeed = 0.9
    if (decimalPart < flickerSpeed) { 
        if (look3SpotLightTV.intensity == 0) {
            look3SpotLightTV.intensity = 3
            tvScreen.material.opacity = 0.9
        } else {
            look3SpotLightTV.intensity = 0
            tvScreen.material.opacity = 0.01

        }
    }


    // Update time uniforms
    if (particlePathMaterial != null) {
        particlePathMaterial.uniforms.uTime.value = timer.getElapsed()
    }

    // Update the animation mixer if it exists
    if (mixer) {
        const delta = timer.getDelta() 
        mixer.update(delta/ 1.5)
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