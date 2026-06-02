import * as THREE from "three";
import {OrbitControls} from "jsm/controls/OrbitControls.js";
import Ammo from "./ammo";

// RENDERER
const w = window.innerWidth;
const h = window.innerHeight;
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(w,h);
// criar canvas element no html
document.body.appendChild(renderer.domElement);
renderer.domElement.id = 'threeCanvas';
// pôr transparente
renderer.setClearColor( 0xffffff, 0);

// CAMERA
const frustumSize = 10;
const aspect = w / h;
// n entendo nada do que está aqui em baixo, a camera é definido pelas laterais e cima e baixo
const camera = new THREE.OrthographicCamera(
  frustumSize * aspect / -2, 
  frustumSize * aspect / 2, 
  frustumSize / 2, 
  frustumSize / -2, 
  0.1, 
  100
);
camera.position.z = 5;

// SCENE
const scene = new THREE.Scene();

// LUZ
// softlight
const hemiLight = new THREE.HemisphereLight(0xFFFFFF, 0xFFFFFF);
scene.add(hemiLight);
// luz direta
const sunLight = new THREE.DirectionalLight(0xFFFFFF, 3); 
sunLight.position.set(5, -2, 7.5);
scene.add(sunLight);

// OBJETOS
const geo = new THREE.BoxGeometry(0.4, 0.8, 2.5);
const mat = new THREE.MeshStandardMaterial({
    color: 0xFFFFFF,
    flatShading: true
});
const mesh = new THREE.Mesh(geo, mat);

const wireMat = new THREE.MeshBasicMaterial({
    color: 0xff82f5,
    wireframe: true
});
const wireMesh = new THREE.Mesh(geo, wireMat);
wireMesh.scale.setScalar(1.001);
// parent dos dois mesh num
mesh.add(wireMesh);

// por de ladinho
mesh.rotation.z = Math.PI/3;
mesh.rotation.x = 5.5;

const meshLinha = new THREE.Group();
// criar linha (só para agora, dps devo fzr à mão)
for (let i = 0; i < 7; i++) {
    const meshCopy = mesh.clone(); 
    meshCopy.position.x = (i -3)*1.5;
    meshLinha.add(meshCopy);
}
 scene.add(meshLinha);

 const meshLinha2 = meshLinha.clone();
 scene.add(meshLinha2);
 meshLinha2.position.y = -1.2;
meshLinha.position.y = 1.2;

// FUNÇÃO ANIMÇAÕES
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

// Ammo setup
function startAmmo(){
    Ammo().then( (Ammo) => {
        Ammo = Ammo
        thisAmmoClone = Ammo
        console.log(Ammo)
    })
}
startAmmo();