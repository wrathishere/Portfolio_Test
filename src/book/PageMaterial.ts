import * as THREE from 'three';
export function makeImageMaterial(texture?: THREE.Texture, fallback='#f4efe5') { if(texture){ texture.colorSpace=THREE.SRGBColorSpace; texture.anisotropy=8; } return new THREE.MeshStandardMaterial({ map:texture, color:texture?'#fff':fallback, roughness:.92, metalness:0, side:THREE.FrontSide }); }
