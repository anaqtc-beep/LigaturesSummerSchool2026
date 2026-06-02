import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";

// --- VARIÁVEIS GLOBAIS DE FÍSICA ---
let physicsLib;
let physicsWorld;
let tmpTrans;
let rigidBodies = [];

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

// --- LUZ ---
const hemiLight = new THREE.HemisphereLight(0xFFFFFF, 0x444444, 1);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xFFFFFF, 3);
sunLight.position.set(5, 5, 7.5);
scene.add(sunLight);

// --- OBJETOS VISUAIS (Modelos) ---
const geo = new THREE.BoxGeometry(0.4, 0.8, 2.5);

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

let cubosDinamicos = [];

// Rotação inicial salva
const rotacaoviz = new THREE.Quaternion();
const eulerAnem = new THREE.Euler(5.5, 0, Math.PI / 3);
rotacaoviz.setFromEuler(eulerAnem);

const alturasY = [1.8, -1.8]; 

alturasY.forEach(yPos => {
    for (let i = 0; i < 7; i++) {
        const meshCopy = new THREE.Mesh(geo, mat);
        
        const wireMat = new THREE.MeshBasicMaterial({ color: 0xff82f5, wireframe: true });
        const wireMesh = new THREE.Mesh(geo, wireMat);
        wireMesh.scale.setScalar(1.001);
        meshCopy.add(wireMesh);

        // Espaçamento seguro aumentado para 2.0 para garantir frestas perfeitas no início
        meshCopy.position.set((i - 3) * 2.0, yPos, 0);
        meshCopy.quaternion.copy(rotacaoviz);

        scene.add(meshCopy);
        cubosDinamicos.push(meshCopy); 
    }
});

// Guardamos a rotação e posição inicial original de cada cubo para mantê-los congelados
const posicoesIniciais = cubosDinamicos.map(c => ({
    pos: c.position.clone(),
    quat: c.quaternion.clone()
}));

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

        console.log("Ammo.js carregado com sucesso!");

        setupPhysicsObjects();
        animate();
    });
}

function setupPhysicsObjects() {
    cubosDinamicos.forEach(cubo => {
        const cuboTamanho = new physicsLib.btVector3(0.2, 0.4, 1.25);
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

    const restitution = 0.8; 
    body.setRestitution(restitution);
    body.setFriction(0.2); 
    body.setDamping(0.0, 0.3); 

    if (startSleeping && mass > 0) {
        body.setActivationState(4); // ISLAND_SLEEPING
        body.setSleepingThresholds(0.0, 0.0); // Impede que forças mínimas o acordem prematuramente
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

    // SCROLL INTERAÇAO
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
                
                // Força a ativação completa limpando o estado congelado antigo
                objAmmo.setActivationState(1); // 1 = ACTIVE_TAG
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

    // CORREÇÃO DEFINITIVA: Se o scroll não aconteceu, nós ignoramos a atualização da física nos cubos
    // e resetamos as transformações para seus estados iniciais fixos.
    if (!gravityTriggered) {
        for (let i = 0; i < cubosDinamicos.length; i++) {
            const cubo = cubosDinamicos[i];
            const original = posicoesIniciais[i];
            cubo.position.copy(original.pos);
            cubo.quaternion.copy(original.quat);
        }
        return; // Sai da função sem rodar o simulador nos blocos dinâmicos
    }

    // Só roda o simulador se a gravidade for disparada
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

startAmmo();