import { useTexture } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
export function Cover({url,front=true,open=0,onClick}:{url:string;front?:boolean;open?:number;onClick?:()=>void}){ const tex=useTexture(url); const mat=useMemo(()=>{tex.colorSpace=THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({map:tex,roughness:.78,metalness:0,color:'#fff'});},[tex]); const angle=front ? -Math.PI*open*.96 : 0; return <group position={[front?1.12:-1.12,0,front?.08:-.08]} rotation-y={angle}><mesh castShadow receiveShadow position={[front?-1.07:1.07,0,0]} onClick={onClick}><boxGeometry args={[2.14,2.9,.09]}/><primitive object={mat} attach="material"/></mesh></group>; }
