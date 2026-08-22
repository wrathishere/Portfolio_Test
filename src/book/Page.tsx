import { useTexture } from '@react-three/drei';
import { useEffect } from 'react';
import * as THREE from 'three';
import type { PortfolioPage } from '../data/types';

const blankTexture = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1200 1600%22%3E%3Crect width=%221200%22 height=%221600%22 fill=%22%23f7f1e8%22/%3E%3C/svg%3E';

export function Page({ page, side, z = 0.05 }: { page?: PortfolioPage; side: 'left' | 'right'; z?: number }) {
  const texture = useTexture(page?.imageUrl ?? blankTexture);
  const x = side === 'left' ? -1.13 : 1.13;

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
  }, [texture]);

  return (
    <mesh receiveShadow position={[x, 0, z]} rotation-y={side === 'left' ? Math.PI : 0}>
      <planeGeometry args={[2.06, 2.78]} />
      <meshStandardMaterial map={texture} color="#fff" roughness={0.94} metalness={0} />
    </mesh>
  );
}
