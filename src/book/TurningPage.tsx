import { useTexture } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { PortfolioPage } from '../data/types';
import { deformPageGeometry } from './pageDeformation';

const blankTexture = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1200 1600%22%3E%3Crect width=%221200%22 height=%221600%22 fill=%22%23f7f1e8%22/%3E%3C/svg%3E';

function configureTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.flipY = true;
}

export function TurningPage({
  front,
  back,
  progress,
  direction,
}: {
  front?: PortfolioPage;
  back?: PortfolioPage;
  progress: number;
  direction: 1 | -1;
}) {
  const frontTexture = useTexture(front?.imageUrl ?? blankTexture);
  const backTexture = useTexture(back?.imageUrl ?? blankTexture);
  const geometry = useMemo(() => new THREE.PlaneGeometry(2.06, 2.78, 56, 12), []);

  useEffect(() => {
    configureTexture(frontTexture);
    configureTexture(backTexture);
  }, [backTexture, frontTexture]);

  useEffect(() => {
    deformPageGeometry(geometry, progress, direction);
  }, [geometry, progress, direction]);

  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial map={frontTexture} roughness={0.96} metalness={0} side={THREE.FrontSide} />
      </mesh>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial map={backTexture} roughness={0.96} metalness={0} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}
