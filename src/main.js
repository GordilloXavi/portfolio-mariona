import * as THREE from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Timer } from 'three/addons/misc/Timer.js'
import GUI from 'lil-gui'
import Stats from 'stats.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'


// Debug
const gui = new GUI()
gui.close()

// Canvas
const canvas = document.querySelector('canvas.webgl')

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

// ###### Scene

// Audio 
const audioListener = new THREE.AudioListener()

const positionalSound = new THREE.PositionalAudio( audioListener )
const audioContext = audioListener.context;

const lowpassFilter = audioContext.createBiquadFilter();
lowpassFilter.type = 'lowpass';
lowpassFilter.frequency.setValueAtTime(100, audioContext.currentTime); // Set cutoff frequency

let muted = false

// load a sound and set it as the PositionalAudio object's buffer
const audioLoader = new THREE.AudioLoader();

audioLoader.load( 'sounds/dumb_rain.mp3', function( buffer ) {
	positionalSound.setBuffer( buffer )
	positionalSound.setRefDistance( 3 )
    positionalSound.setRolloffFactor(5)
    positionalSound.setLoop(true)
    positionalSound.setVolume(1)    
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

// Textures
const textureLoader = new THREE.TextureLoader()
const materialColorTexture = textureLoader.load('textures/kint/color.png')
materialColorTexture.colorSpace = THREE.SRGBColorSpace
materialColorTexture.wrapS = THREE.MirroredRepeatWrapping
materialColorTexture.wrapT = THREE.MirroredRepeatWrapping
materialColorTexture.generateMipmaps = false
materialColorTexture.minFilter = THREE.NearestFilter
materialColorTexture.magFilter = THREE.NearestFilter
materialColorTexture.repeat.set(100, 100)

const materialAOTexture = textureLoader.load('textures/kint/ao.png')
materialAOTexture.wrapS = THREE.MirroredRepeatWrapping
materialAOTexture.wrapT = THREE.MirroredRepeatWrapping
materialAOTexture.generateMipmaps = false
materialAOTexture.repeat.set(100, 100)

const materialHeightTexture = textureLoader.load('textures/kint/height.png')
materialHeightTexture.wrapS = THREE.MirroredRepeatWrapping
materialHeightTexture.wrapT = THREE.MirroredRepeatWrapping
materialHeightTexture.generateMipmaps = false
materialHeightTexture.repeat.set(100, 100)

const materialNormalTexture = textureLoader.load('textures/kint/normal.png')
materialNormalTexture.wrapS = THREE.MirroredRepeatWrapping
materialNormalTexture.wrapT = THREE.MirroredRepeatWrapping
materialNormalTexture.generateMipmaps = false
materialNormalTexture.repeat.set(100, 100)

const materialRoughnessTexture = textureLoader.load('textures/kint/roughness.png')
materialRoughnessTexture.wrapS = THREE.MirroredRepeatWrapping
materialRoughnessTexture.wrapT = THREE.MirroredRepeatWrapping
materialRoughnessTexture.generateMipmaps = false
materialRoughnessTexture.repeat.set(100, 100)

const materialMetalnessTexture = textureLoader.load('textures/kint/metalness.png')
materialMetalnessTexture.wrapS = THREE.MirroredRepeatWrapping
materialMetalnessTexture.wrapT = THREE.MirroredRepeatWrapping
materialMetalnessTexture.generateMipmaps = false
materialMetalnessTexture.repeat.set(100, 100)

//* TEXTURED PEDESTAL 
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


//CRYSTAL PEDESTAL
/*
const pedestalMaterial = new THREE.MeshPhysicalMaterial()
pedestalMaterial.color = new THREE.Color(0xffffff)
pedestalMaterial.metalness = 0
pedestalMaterial.roughness = 0.05
pedestalMaterial.transmission = 0.98
pedestalMaterial.ior = 1.6
pedestalMaterial.thickness = 0.5


const pedestal = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5, 100, 100),
    pedestalMaterial
)

pedestal.castShadow = true
pedestal.receiveShadow = true

pedestal.add( sound )
 scene.add(pedestal)
*/

//const floorMaterial = new THREE.MeshStandardMaterial(0x000000)
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50, 10, 10),
    //new THREE.MeshStandardMaterial()
    marbleMaterial
)
floor.rotateX(-Math.PI/2)
floor.receiveShadow = true
scene.add(floor)

/**
 * Lights
 */
const lightsGUIFolder = gui.addFolder( 'lights' );
lightsGUIFolder.close()

// Ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.012)
scene.add(ambientLight)

lightsGUIFolder.add(ambientLight, 'intensity', 0, 3).name('ambient light')

const spotLightTargetObject = new THREE.Object3D();
spotLightTargetObject.position.set(0, 1, 0)
scene.add(spotLightTargetObject)

const spotLightR = new THREE.SpotLight(0xffffff, 2)
lightsGUIFolder.add(spotLightR, 'intensity', 0, 5).name('light 1')

spotLightR.angle = Math.PI / 4
spotLightR.castShadow = true;
spotLightR.shadow.mapSize.width = 1024
spotLightR.shadow.mapSize.height = 1024
const shadowBias = -0.01;
spotLightR.shadow.bias = shadowBias

spotLightR.shadow.camera.near = 1
spotLightR.shadow.camera.far = 7
spotLightR.shadow.camera.fov = 30
const spotLightRCameraHelper = new THREE.CameraHelper(spotLightR.shadow.camera)
//scene.add(spotLightRCameraHelper)

spotLightR.penumbra = 0.4
spotLightR.position.set(-0.9, 1.4, 0)
spotLightR.target = spotLightTargetObject

scene.add(spotLightR)

const spotLightL = new THREE.SpotLight(0xffffff, 2)
lightsGUIFolder.add(spotLightL, 'intensity', 0, 5).name('light 2')

spotLightL.angle = Math.PI / 4
spotLightL.castShadow = true
spotLightL.shadow.mapSize.width = 1024
spotLightL.shadow.mapSize.height = 1024
spotLightL.shadow.bias = shadowBias

spotLightL.shadow.camera.near = 1
spotLightL.shadow.camera.far = 7
spotLightL.shadow.camera.fov = 30
const spotLightLCameraHelper = new THREE.CameraHelper(spotLightL.shadow.camera)
//scene.add(spotLightLCameraHelper)


spotLightL.penumbra = 0.4
spotLightL.position.set(0.9, 1.4, 0)
spotLightL.target = spotLightTargetObject

scene.add(spotLightL)

const spotLightF = new THREE.SpotLight(0xffffff, 2)
lightsGUIFolder.add(spotLightF, 'intensity', 0, 5).name('light 3')

spotLightF.angle = Math.PI / 4
spotLightF.castShadow = true
spotLightF.shadow.mapSize.width = 1024
spotLightF.shadow.mapSize.height = 1024
spotLightF.shadow.bias = shadowBias

spotLightF.shadow.camera.near = 1
spotLightF.shadow.camera.far = 7
spotLightF.shadow.camera.fov = 30
const spotLightFCameraHelper = new THREE.CameraHelper(spotLightF.shadow.camera)
//scene.add(spotLightFCameraHelper)


spotLightF.penumbra = 0.4
spotLightF.position.set(0, 1.4, 0.9)
spotLightF.target = spotLightTargetObject

scene.add(spotLightF)

const spotLightB = new THREE.SpotLight(0xffffff, 2)
lightsGUIFolder.add(spotLightB, 'intensity', 0, 5).name('light 4')

spotLightB.angle = Math.PI / 4
spotLightB.castShadow = true
spotLightB.shadow.mapSize.width = 1024
spotLightB.shadow.mapSize.height = 1024
spotLightB.shadow.bias = shadowBias

spotLightB.shadow.camera.near = 1
spotLightB.shadow.camera.far = 7
spotLightB.shadow.camera.fov = 30
const spotLightBCameraHelper = new THREE.CameraHelper(spotLightB.shadow.camera)
//scene.add(spotLightBCameraHelper)


spotLightB.penumbra = 0.4
spotLightB.position.set(0, 1.4, -0.9)
spotLightB.target = spotLightTargetObject

scene.add(spotLightB)

let model
const gltf_loader = new GLTFLoader();
gltf_loader.load('/models/look_2_pose_1.glb', function(gltf) { 
    model = gltf.scene

    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true
            const geometry = child.geometry
            geometry.computeVertexNormals() // Calculate normals
        }
    });

    //model.scale.set(0.5, 0.5, 0.5)
    // look_2_pose_2: 
    //*/
    //model.scale.set(1.5, 1.5, 1.5)
    model.position.set(0, 0.4, 0)
    model.rotateY(Math.PI)

    scene.add(model)
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
            child.material.emissive.set(0xffffff);
        }
    });

    model.scale.set(0.5, 0.5, 0.5)
    model.rotateY(Math.PI/2)

    for (let i = 0; i < positions.length; i++) {
        const modelClone = model.clone()
        modelClone.position.copy(positions[i])
        modelClone.rotateY(Math.PI / 2 * i)
        scene.add(modelClone)
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
    });

    model.scale.set(0.25, 0.145, 0.25)
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
const gridHelper = new THREE.GridHelper(50, 50)
//scene.add(gridHelper)

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

/**
 * Camera
 */
const cameraControlParams = {
    movementSpeed: 20,
    velocityDecay: 0.1,
    initialX: -2,
    initialY: 0.85,
    initialZ: -2,
    movementCounter: 0,
    footstepAmplitude: 80,
    footstepFreq: 1.2
}

const camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 0.1, 500)
camera.position.x = cameraControlParams.initialX
camera.position.y = cameraControlParams.initialY
camera.position.z = cameraControlParams.initialZ
camera.lookAt(0, 0.8, 0)
camera.add( audioListener );

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
})
renderer.shadowMap.enabled = true
renderer.colorSpace = THREE.SRGBColorSpace

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
controlsGUIFolder.close()

let moveForward = false
let moveBackward = false
let moveLeft = false
let moveRight = false
const velocity = new THREE.Vector3()
const direction = new THREE.Vector3()

controlsGUIFolder.add(cameraControlParams, 'movementSpeed', 1, 150).name('movement speed')
controlsGUIFolder.add(cameraControlParams, 'velocityDecay', 0.01, 5)
controlsGUIFolder.add(cameraControlParams, 'footstepAmplitude', 0, 100).name('footsteps amplitude')
controlsGUIFolder.add(cameraControlParams, 'footstepFreq', 0, 10).name('footsteps speed')
controlsGUIFolder.add(cameraControlParams, 'initialY', 0.50, 1.50).name('camera height')
//controlsGUIFolder.add(camera, 'fov', 0, 100).name('FOV')

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
    }
    positionalSound.setFilter(null)
    positionalSound.setVolume(1)
    for (let i = 0; i < footsteps.audios.length; i++) footsteps.audios[i].setFilter(null);
} )

controls.addEventListener( 'unlock', function () {
    blocker.style.display = 'block'
    instructions.style.display = ''
    gui.show()
    positionalSound.setFilter(lowpassFilter);
    positionalSound.setVolume(0.7)

    for (let i = 0; i < footsteps.audios.length; i++) footsteps.audios[i].setFilter(lowpassFilter);
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
            canvas.requestFullscreen()
            controls.lock()
        } else {
            document.exitFullscreen()
        }
    }
    else if (event.code === 'KeyM') {
        if (positionalSound.isPlaying) {
            positionalSound.pause()
            muted = true
        } else {
            positionalSound.play()
            muted = false
        }
    }
}

document.addEventListener( 'keydown', onKeyDown )
document.addEventListener( 'keyup', onKeyUp )
document.addEventListener( 'keypress', onKeyPress)

// Post-processing setup
renderer.physicallyCorrectLights = true
lightsGUIFolder.add(renderer, 'physicallyCorrectLights').name('physically correct lighting')
const effectComposer = new EffectComposer(renderer);
effectComposer.setSize(sizes.width, sizes.height)
effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
effectComposer.addPass(new RenderPass(scene, camera));

const unrealBloomPass = new UnrealBloomPass()

unrealBloomPass.strength = 0.3
unrealBloomPass.radius = 0.1
unrealBloomPass.threshold = 0.8

const bloomGUIFolder = gui.addFolder('bloom')
bloomGUIFolder.close()

let postprocessingParams = {
    enabled: true
}

bloomGUIFolder.add(postprocessingParams, 'enabled')
bloomGUIFolder.add(unrealBloomPass, 'strength', 0, 2)
bloomGUIFolder.add(unrealBloomPass, 'radius', 0, 2)
bloomGUIFolder.add(unrealBloomPass, 'threshold', 0, 2)

effectComposer.addPass(unrealBloomPass)

// TODO: Motion Blur

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

    velocity.x -= velocity.x * frameElapsedTime * 1/cameraControlParams.velocityDecay
	velocity.z -= velocity.z * frameElapsedTime * 1/cameraControlParams.velocityDecay

    // Movement:
    direction.z = Number( moveForward ) - Number( moveBackward )
	direction.x = Number( moveRight ) - Number( moveLeft )
    direction.normalize()

    if ( moveForward || moveBackward ) velocity.z -= direction.z * frameElapsedTime
    if ( moveLeft || moveRight ) velocity.x -= direction.x * frameElapsedTime

    controls.moveRight( - velocity.x * frameElapsedTime * cameraControlParams.movementSpeed )
	controls.moveForward( - velocity.z * frameElapsedTime * cameraControlParams.movementSpeed )

    // Footsteps
    if (moveForward || moveBackward || moveLeft || moveRight) {
        cameraControlParams.movementCounter += frameElapsedTime
        const footstepHeight = Math.sin(-Math.PI/2 + cameraControlParams.movementCounter * (cameraControlParams.movementSpeed) / cameraControlParams.footstepFreq) / cameraControlParams.footstepAmplitude + 1/cameraControlParams.footstepAmplitude
        if (footstepHeight * cameraControlParams.footstepAmplitude > 1.5) {
            // Play the footstep at the top of the sin function (that has amplitude [0, 2])
            let footstepPlaying = false
            for (let i = 0; i < footsteps.audios.length && !footstepPlaying; i++) footstepPlaying = footsteps.audios[i].isPlaying
            
            if (!footstepPlaying) {
                footsteps.audios[footsteps.currentIndex].play()
                footsteps.currentIndex = (footsteps.currentIndex + 1) % footsteps.audios.length
            }
        }
        camera.position.y = cameraControlParams.initialY + footstepHeight
    } else {
        const footstepHeight = Math.sin(-Math.PI/2 + cameraControlParams.movementCounter * (cameraControlParams.movementSpeed) / cameraControlParams.footstepFreq) / cameraControlParams.footstepAmplitude + 1/cameraControlParams.footstepAmplitude
        if (footstepHeight > 0.0005) {
            camera.position.y = cameraControlParams.initialY + footstepHeight
            cameraControlParams.movementCounter += frameElapsedTime
        } else{
            cameraControlParams.movementCounter = 0
            camera.position.y = cameraControlParams.initialY
        }
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