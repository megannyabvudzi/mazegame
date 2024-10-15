//---------------------------------IMPORTS-----------------------------------------

import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { AnimationMixer, Clock } from 'three';

//--------------------------------INITIALISATION------------------------------------

// Initialize the Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

// renderer.setClearColor(0x000000);
renderer.setClearColor(0x222222); // Dark gray background

document.body.appendChild(renderer.domElement);  // Append canvas to body

// Ambient light
const light = new THREE.AmbientLight(0x404040);  // Soft white light
scene.add(light);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);



// ----------------------------------TEST PLAYER SETUP (for debugging purposes)--------------------------------------


// const axesHelper = new THREE.AxesHelper(5); // Axis size 5 units
// scene.add(axesHelper);
// // Temporary cube for debugging
// const geometry = new THREE.BoxGeometry(1, 1, 1);
// const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
// const cube = new THREE.Mesh(geometry, material);
// cube.position.set(2,0,0);
// scene.add(cube); // Add the cube to the scene


//----------------------------------LOADING PLAYER ANIMATIONS-----------------------------------

const clock = new Clock();

let character, mixer, walkAction, idleAction;

const loader = new FBXLoader();
loader.load('./assets/jogPlayer.fbx', (joggingfbx) => {
  character = joggingfbx; // load character to scene
  character.position.set(0,-5,0);
  character.scale.set(0.05,0.05,0.05);
  scene.add(character);

  mixer = new AnimationMixer(character);
  walkAction = mixer.clipAction(joggingfbx.animations[0]); // jogging animation
  walkAction.loop = THREE.LoopRepeat // loop the jogging animation
  walkAction.play();

  loader.load('./assets/idlePlayer.fbx', (idleFBX) => {
    idleAction = mixer.clipAction(idleFBX.animations[0]); // Idle animation
    idleAction.loop = THREE.LoopRepeat; // Loop the idle animation
    idleAction.play(); // Start with idle animation initially
    idleAction.weight = 1; // Full weight for idle
    walkAction.weight = 0; // No weight for jogging initially
  });

  setInitialCameraPosition();
}, (xhr) => {
  console.log((xhr.loaded / xhr.total * 100 + '% loaded'));
}, (error) => {
  console.error('Error loading jogging FBX', error);
});

// ----------------------------------PLAYER MOVEMENT-----------------------------------
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
};
      
// Add event listeners to track key states
document.addEventListener('keydown', (event) => {
  if (keys.hasOwnProperty(event.key)) {
    keys[event.key] = true;  // Set the corresponding key state to true
  }
});

document.addEventListener('keyup', (event) => {
  if (keys.hasOwnProperty(event.key)) {
    keys[event.key] = false;  // Set the corresponding key state to false
  }
});

// ----------------------------------CAMERA SETUP--------------------------------------
// Set the camera position
function setInitialCameraPosition() {
  if (character) {
    camera.position.set(0, 5, 10);
    camera.lookAt(character.position);  // Ensure camera looks at character
  }
}

// Function to update camera to follow player
function updateCamera() {
  if (character) {
    camera.position.x = character.position.x;  // Move camera horizontally with player
    camera.position.z = character.position.z + 10;  // Keep camera behind player
    camera.lookAt(character.position);  // Ensure camera always looks at player
  }
  
}

// ----------------------------------GAME LOOP-----------------------------------------

// In your animate function

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta(); // Time elapsed since last frame
  if (mixer) mixer.update(delta); // Update animation mixer

  // Player movement and animation logic
  if (character) {
    let isMoving = false;
    let direction = new THREE.Vector3(0, 0, 0); // Direction vector

    // Check key states for movement
    if (keys.w) {
      direction.z -= 1; // Move forward
      isMoving = true;
    }
    if (keys.s) {
      direction.z += 1; // Move backward
      isMoving = true;
    }
    if (keys.a) {
      direction.x -= 1; // Move left
      isMoving = true;
    }
    if (keys.d) {
      direction.x += 1; // Move right
      isMoving = true;
    }

    if (direction.length() > 0) {
      direction.normalize(); // Normalize direction vector

      // Calculate the target angle for rotation
      const targetAngle = Math.atan2(direction.x, direction.z);

      // Normalize the angle difference to the range [-π, π] for the shortest rotation
      const currentAngle = character.rotation.y;
      const angleDifference = targetAngle - currentAngle;

      // Ensure the angle difference is in the shortest range by using THREE.MathUtils.euclideanModulo
      const shortestAngleDifference = THREE.MathUtils.euclideanModulo(angleDifference + Math.PI, Math.PI * 2) - Math.PI;

      // Smoothly rotate to the target direction, using the shortest path
      character.rotation.y += shortestAngleDifference * 0.1; // Adjust rotation speed

      character.position.add(direction.multiplyScalar(0.1)); // Move the character

      // Transition to jogging animation
      if (walkAction && idleAction) {
        walkAction.weight = THREE.MathUtils.lerp(walkAction.weight, 1, 0.1); // Increase weight for jogging
        idleAction.weight = THREE.MathUtils.lerp(idleAction.weight, 0, 0.1); // Decrease weight for idle
      }
    } else {
      // Transition to idle animation
      if (walkAction && idleAction) {
        walkAction.weight = THREE.MathUtils.lerp(walkAction.weight, 0, 0.1); // Decrease weight for jogging
        idleAction.weight = THREE.MathUtils.lerp(idleAction.weight, 1, 0.1); // Increase weight for idle
      }
    }

    // Update the weights of the actions
    if (walkAction) walkAction.setEffectiveWeight(walkAction.weight);
    if (idleAction) idleAction.setEffectiveWeight(idleAction.weight);
  }
  updateCamera();
  renderer.render(scene, camera); // Render the scene
}


// Start the game loop
animate();
