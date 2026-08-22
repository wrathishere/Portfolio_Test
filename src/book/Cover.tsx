import { useTexture } from '@react-three/drei';
import { useEffect } from 'react';
import * as THREE from 'three';

export function Cover({
  url,
  front = true,
  open = 0,
  onClick,
}: {
  url: string;
  front?: boolean;
  open?: number;
  onClick?: () => void;
}) {
  const texture = useTexture(url);
  const angle = front ? -Math.PI * open * 0.96 : 0;

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
  }, [texture]);

  return (
    <group position={[front ? 1.12 : -1.12, 0, front ? 0.08 : -0.08]} rotation-y={angle}>
      <mesh castShadow receiveShadow position={[front ? -1.07 : 1.07, 0, 0]} onClick={onClick}>
        <boxGeometry args={[2.14, 2.9, 0.09]} />
        <meshStandardMaterial map={texture} color="#fff" roughness={0.78} metalness={0} />
      </mesh>
    </group>
  );
}
