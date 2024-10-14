import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { leaderboard } from './leaderboard.js';

let scene, camera, renderer, controls;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, canJump = false;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let player, playerHeight = 1.8;

let currentLevel = 0;
const levels = [
    { name: "Easy", maze: 'maze_easy.gltf' },
    { name: "Medium", maze: 'maze_medium.gltf' },
    { name: "Hard", maze: 'maze_hard.gltf' }
];

let startTime, elapsedTime;
let isGameActive = false;
let gameState = 'mainMenu';

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = playerHeight;
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    player = new THREE.Mesh(geometry, material);
    player.position.y = playerHeight / 2;
    player.name = 'player';
    scene.add(player);

    controls = new PointerLockControls(camera, document.body);
    scene.add(controls.getObject());

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onWindowResize, false);

    document.getElementById('startGameButton').addEventListener('click', () => {
        loadMaze(levels[currentLevel].maze);
    });

    showMainMenu();
}

function loadMaze(mazePath) {
    const loader = new GLTFLoader();
    loader.load(
        mazePath,
        (gltf) => {
            scene.add(gltf.scene);
            player.position.set(0, playerHeight / 2, 0);
            controls.getObject().position.set(0, playerHeight, 0);
            startGame();
        },
        (xhr) => {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (error) => {
            console.error('An error happened', error);
        }
    );
}

function startGame() {
    gameState = 'playing';
    isGameActive = true;
    startTime = performance.now();
    updateLevelInfo();
    document.getElementById('mainMenu').style.display = 'none';
    controls.lock();
}

function endGame() {
    isGameActive = false;
    elapsedTime = (performance.now() - startTime) / 1000;
    console.log(`Level ${currentLevel + 1} completed in ${elapsedTime.toFixed(2)} seconds`);
    updateLeaderboard(elapsedTime);
    nextLevel();
}

function nextLevel() {
    currentLevel++;
    if (currentLevel >= levels.length) {
        console.log("Game Completed!");
        showGameCompletionScreen();
        return;
    }
    scene.remove(scene.getObjectByName('maze'));
    loadMaze(levels[currentLevel].maze);
}

function updateLeaderboard(time) {
    leaderboard.addScore(currentLevel, time);
    leaderboard.displayLeaderboard();
}

function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();

    if (controls.isLocked === true && gameState === 'playing') {
        const delta = (time - prevTime) / 1000;

        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= 9.8 * 100.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

        if (!checkCollisions(controls.getObject().position, velocity, delta)) {
            controls.moveRight(-velocity.x * delta);
            controls.moveForward(-velocity.z * delta);
        }

        controls.getObject().position.y += (velocity.y * delta);

        if (controls.getObject().position.y < playerHeight) {
            velocity.y = 0;
            controls.getObject().position.y = playerHeight;
            canJump = true;
        }

        player.position.x = controls.getObject().position.x;
        player.position.z = controls.getObject().position.z;
        player.position.y = controls.getObject().position.y - (playerHeight / 2);

        if (checkMazeCompletion()) {
            endGame();
        }
    }

    prevTime = time;

    if (isGameActive) {
        updateTimer();
    }

    renderer.render(scene, camera);
}

function checkCollisions(position, velocity, delta) {
    const nextPosition = new THREE.Vector3(
        position.x - velocity.x * delta,
        position.y,
        position.z - velocity.z * delta
    );
    
    const mazeWalls = scene.getObjectByName('mazeWalls');
    if (!mazeWalls) return false;

    const raycaster = new THREE.Raycaster();
    const directions = [
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, -1)
    ];

    for (let direction of directions) {
        raycaster.set(nextPosition, direction);
        const intersects = raycaster.intersectObjects(mazeWalls.children, true);
        if (intersects.length > 0 && intersects[0].distance < 0.5) {
            return true;
        }
    }
    
    return false;
}

function checkMazeCompletion() {
    const mazeExit = scene.getObjectByName('mazeExit');
    if (!mazeExit) return false;

    const distanceToExit = player.position.distanceTo(mazeExit.position);
    return distanceToExit < 1.5;
}

function updateTimer() {
    const currentTime = performance.now();
    elapsedTime = (currentTime - startTime) / 1000;
    document.getElementById('timer').textContent = `Time: ${elapsedTime.toFixed(2)}`;
}

function updateLevelInfo() {
    document.getElementById('levelInfo').textContent = `Level: ${currentLevel + 1} - ${levels[currentLevel].name}`;
}

function showGameCompletionScreen() {
    gameState = 'completed';
    const completionScreen = document.createElement('div');
    completionScreen.id = 'completionScreen';
    completionScreen.innerHTML = `
        <h1>Congratulations!</h1>
        <p>You've completed all levels!</p>
        <button id="restartButton">Play Again</button>
    `;
    document.body.appendChild(completionScreen);
    document.getElementById('restartButton').addEventListener('click', restartGame);
}

function restartGame() {
    currentLevel = 0;
    document.body.removeChild(document.getElementById('completionScreen'));
    loadMaze(levels[currentLevel].maze);
}

function showMainMenu() {
    gameState = 'mainMenu';
    document.getElementById('mainMenu').style.display = 'block';
}

function onKeyDown(event) {
    switch (event.code) {
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
        case 'Space':
            if (canJump === true) velocity.y += 350;
            canJump = false;
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
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
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
animate();