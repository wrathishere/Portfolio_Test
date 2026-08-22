export function Spine() {
  return (
    <mesh castShadow receiveShadow position={[0, 0, 0]}>
      <boxGeometry args={[0.18, 2.98, 0.32]} />
      <meshStandardMaterial color="#211812" roughness={0.86} metalness={0} />
    </mesh>
  );
}
