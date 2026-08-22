import { useTexture } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { PortfolioPage } from '../data/types';
import { deformPageGeometry } from './pageDeformation';
export function TurningPage({front,back,progress,direction}:{front?:PortfolioPage;back?:PortfolioPage;progress:number;direction:1|-1}){ const tex=useTexture(front?.imageUrl ?? 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E'); const geom=useMemo(()=>new THREE.PlaneGeometry(2.06,2.78,44,8),[]); const ref=useRef<THREE.Mesh>(null); useEffect(()=>{deformPageGeometry(geom,progress,direction)},[geom,progress,direction]); return <mesh ref={ref} geometry={geom} castShadow receiveShadow><meshStandardMaterial map={tex} roughness={.96} metalness={0} side={THREE.DoubleSide}/></mesh>; }
