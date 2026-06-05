import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

// --- VARIÁVEIS GLOBAIS DE FÍSICA ---
let physicsLib;
let physicsWorld;
let tmpTrans;
let rigidBodies = [];
let cubosDinamicos = [];
let posicoesIniciais = []; // We will fill this dynamically

// --- RENDERER ---
const w = window.innerWidth;
const h = window.innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);
renderer.domElement.id = 'threeCanvas';
renderer.setClearColor(0xffffff, 0);

// --- CAMERA ---
const frustumSize = 10;
const aspect = w / h;
const camera = new THREE.OrthographicCamera(
    frustumSize * aspect / -2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    100
);
camera.position.z = 5;

// --- SCENE ---
const scene = new THREE.Scene();
const loader = new STLLoader();

// --- LUZ ---
const hemiLight = new THREE.HemisphereLight(0xFFFFFF, 0x444444, 1);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xFFFFFF, 3);
sunLight.position.set(5, 5, 7.5);
scene.add(sunLight);

// --- OBJETOS VISUAIS CRUCIAL SETUP ---
const screenHalfWidth = (frustumSize * aspect) / 2;
const chaoLarguraVisual = (screenHalfWidth * 2) + 10; 

const chaoGeo = new THREE.BoxGeometry(chaoLarguraVisual, 1, 10); 
const chaoMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
const mat = new THREE.MeshStandardMaterial({
    color: 0xFFFFFF,
    flatShading: true
});
const chao = new THREE.Mesh(chaoGeo, chaoMat);
chao.position.set(0, -5.5, 0); 
scene.add(chao);

// PAREDES VISUAIS
const wallWidth = 2; 
const wallHeight = 20;
const wallDepth = 10;
const wallThickness = 2; 

const frontalWallGeo = new THREE.BoxGeometry(chaoLarguraVisual, wallHeight, wallThickness);
const wallGeo = new THREE.BoxGeometry(wallWidth, wallHeight, wallDepth);
const wallMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, visible: false }); 

const paredeEsquerda = new THREE.Mesh(wallGeo, wallMat);
const paredeDireita = new THREE.Mesh(wallGeo, wallMat);
const paredeFrente = new THREE.Mesh(frontalWallGeo, wallMat);
const paredeTras = new THREE.Mesh(frontalWallGeo, wallMat);

paredeEsquerda.position.set(-screenHalfWidth - (wallWidth / 2), 5, 0);
paredeDireita.position.set(screenHalfWidth + (wallWidth / 2), 5, 0);
paredeFrente.position.set(0, 5, 2.0); 
paredeTras.position.set(0, 5, -2.0); 

scene.add(paredeFrente);
scene.add(paredeTras);
scene.add(paredeEsquerda);
scene.add(paredeDireita);

// Rotação inicial
const rotacaoviz = new THREE.Quaternion();
const eulerAnem = new THREE.Euler(5.5, 0, Math.PI / 3);
rotacaoviz.setFromEuler(eulerAnem);

const alturasY = [1.8, -1.8]; 

// --- LOADING MANAGER LOGIC ---
// We use a counter to make sure all 14 logos are loaded before starting physical operations
let loadedCount = 0;
const totalLogos = alturasY.length * 7; 

// --- CARREGAR APENAS UM LOGO CENTRALIZADO ---
loader.load('LSS_3D_Logo.stl', function (geometry) {
    
    geometry.center(); 

    // 2. Calcula o tamanho real dele
    geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    geometry.boundingBox.getSize(size);
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = 9 / maxDim;
    geometry.scale(scaleFactor, scaleFactor, scaleFactor);

    const meshCopy = new THREE.Mesh(geometry, mat);
    
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xff82f5, wireframe: true });
    const wireMesh = new THREE.Mesh(geometry, wireMat);
    wireMesh.scale.setScalar(1.001);
    meshCopy.add(wireMesh);

    // Posiciona exatamente no centro do mundo (0, 0, 0)
    meshCopy.position.set(0, 0, 0);
    meshCopy.quaternion.copy(rotacaoviz);

    //Adiciona à cena e às listas da física
    scene.add(meshCopy);
    cubosDinamicos.push(meshCopy); 

    // Guarda a posição inicial estática
    posicoesIniciais.push({
        pos: meshCopy.position.clone(),
        quat: meshCopy.quaternion.clone()
    });

    startAmmo();

}, (xhr) => {
    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
}, (error) => {
    console.error('Erro ao carregar o STL:', error);
});

// --- AMMO SETUP ---
function startAmmo() {
    Ammo().then((lib) => {
        physicsLib = lib;
        
        tmpTrans = new physicsLib.btTransform();

        const collisionConfiguration = new physicsLib.btDefaultCollisionConfiguration();
        const dispatcher = new physicsLib.btCollisionDispatcher(collisionConfiguration);
        const overlappingPairCache = new physicsLib.btDbvtBroadphase();
        const solver = new physicsLib.btSequentialImpulseConstraintSolver();

        physicsWorld = new physicsLib.btDiscreteDynamicsWorld(
            dispatcher, overlappingPairCache, solver, collisionConfiguration
        );
        physicsWorld.setGravity(new physicsLib.btVector3(0, 0, 0));

        console.log("Ammo.js carregado com sucesso com objetos sincronizados!");

        setupPhysicsObjects();
        animate();
    });
}

function setupPhysicsObjects() {
    cubosDinamicos.forEach(cubo => {
        // Adjust these bounding dimensions to match your STL scale if collision feels loose
        const cuboTamanho = new physicsLib.btVector3(0.4, 0.4, 0.4); 
        createRigidBody(cubo, 1, cuboTamanho, true); 
    });

    createRigidBody(chao, 0, new physicsLib.btVector3(chaoLarguraVisual / 2, 0.5, 5), false);

    const sideWallHalfExtents = new physicsLib.btVector3(wallWidth / 2, wallHeight / 2, wallDepth / 2);
    createRigidBody(paredeEsquerda, 0, sideWallHalfExtents, false);
    createRigidBody(paredeDireita, 0, sideWallHalfExtents, false);

    const frontalWallHalfExtents = new physicsLib.btVector3(chaoLarguraVisual / 2, wallHeight / 2, wallThickness / 2);
    createRigidBody(paredeFrente, 0, frontalWallHalfExtents, false);
    createRigidBody(paredeTras, 0, frontalWallHalfExtents, false);
}

function createRigidBody(threeMesh, mass, size, startSleeping = false) {
    const pos = threeMesh.position;
    const quat = threeMesh.quaternion;

    const transform = new physicsLib.btTransform();
    transform.setIdentity();
    transform.setOrigin(new physicsLib.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(new physicsLib.btQuaternion(quat.x, quat.y, quat.z, quat.w));

    const motionState = new physicsLib.btDefaultMotionState(transform);
    const colShape = new physicsLib.btBoxShape(size);
    
    const localInertia = new physicsLib.btVector3(0, 0, 0);
    if (mass > 0) colShape.calculateLocalInertia(mass, localInertia);

    const rbInfo = new physicsLib.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
    const body = new physicsLib.btRigidBody(rbInfo);

    body.setRestitution(0.8);
    body.setFriction(0.2); 
    body.setDamping(0.0, 0.3); 

    if (startSleeping && mass > 0) {
        body.setActivationState(4); // ISLAND_SLEEPING
        body.setSleepingThresholds(0.0, 0.0);
    }

    physicsWorld.addRigidBody(body);

    threeMesh.userData.physicsBody = body;
    rigidBodies.push(threeMesh);
}

// --- LOOP DE ANIMAÇÃO ---
const clock = new THREE.Clock();
let gravityTriggered = false; 

function animate() {
    requestAnimationFrame(animate);
    
    let deltaTime = clock.getDelta();
    updatePhysics(deltaTime);

    renderer.render(scene, camera);

    const textoObj = document.getElementById("scrollTeste");
    if (!textoObj) return;

    const textoRect = textoObj.getBoundingClientRect();
    const textoTop = textoRect.top;
    const borda = window.innerHeight;

    if (textoTop < borda && !gravityTriggered) {
        gravityTriggered = true; 
        physicsWorld.setGravity(new physicsLib.btVector3(0, -9.81, 0));
        
        rigidBodies.forEach(obj => {
            if (
                obj !== chao && 
                obj !== paredeEsquerda && 
                obj !== paredeDireita &&
                obj !== paredeFrente && 
                obj !== paredeTras
            ) {
                const objAmmo = obj.userData.physicsBody;
                objAmmo.setActivationState(1); // ACTIVE_TAG
                objAmmo.activate(true);

                const randomAngularVelocityY = (Math.random() - 0.5) * 6.0; 
                const randomAngularVelocityX = (Math.random() - 0.5) * 2.0;

                const velocityVector = new physicsLib.btVector3(
                    randomAngularVelocityX, 
                    randomAngularVelocityY, 
                    0
                );
                objAmmo.setAngularVelocity(velocityVector);
            }
        }); 
    }
}

function updatePhysics(deltaTime) {
    if (!physicsWorld || !tmpTrans) return;

    if (!gravityTriggered) {
        for (let i = 0; i < cubosDinamicos.length; i++) {
            const cubo = cubosDinamicos[i];
            const original = posicoesIniciais[i];
            if (original) {
                cubo.position.copy(original.pos);
                cubo.quaternion.copy(original.quat);
            }
        }
        return; 
    }

    physicsWorld.stepSimulation(deltaTime, 10);

    for (let i = 0; i < rigidBodies.length; i++) {
        const objThree = rigidBodies[i];
        const objAmmo = objThree.userData.physicsBody;
        const ms = objAmmo.getMotionState();

        if (ms) {
            ms.getWorldTransform(tmpTrans);
            const p = tmpTrans.getOrigin();
            const q = tmpTrans.getRotation();
            
            objThree.position.set(p.x(), p.y(), p.z());
            objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
        }
    }
}