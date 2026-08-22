export function PageStack({ side, count }: { side: 'left' | 'right'; count: number }) {
  const x = side === 'left' ? -1.13 : 1.13;
  const visibleSheets = Math.min(Math.max(count, 0), 16);

  return (
    <group position={[x, 0, 0.015]}>
      {Array.from({ length: visibleSheets }, (_, index) => (
        <mesh key={`${side}-${index}`} receiveShadow position={[0, 0, index * 0.005]}>
          <boxGeometry args={[2.06, 2.78, 0.004]} />
          <meshStandardMaterial color={index % 2 ? '#eee8dc' : '#f7f2e8'} roughness={0.96} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}
