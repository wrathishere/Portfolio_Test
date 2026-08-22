import { useTexture } from '@react-three/drei';
import type { PortfolioPage } from '../data/types';
export function Page({page,side,z=.05}:{page?:PortfolioPage;side:'left'|'right';z?:number}){ const tex=useTexture(page?.imageUrl ?? 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E'); const x=side==='left'?-1.13:1.13; return <mesh receiveShadow position={[x,0,z]} rotation-y={side==='left'?Math.PI:0}><planeGeometry args={[2.06,2.78]}/><meshStandardMaterial map={tex} color="#fff" roughness={.94} metalness={0}/></mesh>; }
