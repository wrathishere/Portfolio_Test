import { Environment, PerspectiveCamera, useCursor } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useRef, useState } from 'react';
import * as THREE from 'three';
import type { PortfolioPage } from '../data/types';
import { BookController } from './BookController';
import { BookStatus } from './BookState';
import { Cover } from './Cover';
import { Page } from './Page';
import { PageStack } from './PageStack';
import { Spine } from './Spine';
import { TurningPage } from './TurningPage';

interface DragState {
  startX: number;
  direction: 'forward' | 'backward';
}

function Scene({ pages, controller }: { pages: PortfolioPage[]; controller: BookController }) {
  const [, rerender] = useState(0);
  const group = useRef<THREE.Group>(null);
  const drag = useRef<DragState>();
  const cover = pages.find((page) => page.type === 'cover') ?? pages[0];
  const backCover = pages.find((page) => page.type === 'back_cover') ?? pages[pages.length - 1];
  const innerPages = pages.filter((page) => page.type === 'page');
  const leftPage = innerPages[Math.max(0, controller.spread * 2 - 1)];
  const rightPage = innerPages[controller.spread * 2];
  const activeFront = controller.direction === 'forward' ? rightPage : leftPage;
  const activeBack = controller.direction === 'forward' ? innerPages[controller.spread * 2 + 1] : innerPages[controller.spread * 2 - 2];

  controller.notify = () => rerender((value) => value + 1);
  useCursor(controller.canInteract());

  useFrame(({ camera }) => {
    const open = controller.coverOpen;
    camera.position.lerp(new THREE.Vector3(0, open ? -0.22 : -0.55, open ? 4.65 : 5.2), 0.045);
    camera.lookAt(0, 0, 0);

    if (group.current) {
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, open ? -0.08 : -0.18, 0.05);
      group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, open ? 0 : -0.04, 0.05);
    }
  });

  const handlePointerDown = (event: { point: THREE.Vector3; clientX: number; stopPropagation: () => void }) => {
    if (controller.status === BookStatus.CLOSED) {
      controller.open();
      return;
    }

    if (controller.status !== BookStatus.OPEN) return;

    const direction = event.point.x > 0 ? 'forward' : 'backward';
    if (direction === 'forward' && controller.spread >= Math.ceil(innerPages.length / 2) - 1) return;
    if (direction === 'backward' && controller.spread <= 0) return;

    drag.current = { startX: event.clientX, direction };
    event.stopPropagation();
  };

  const handlePointerMove = (event: { clientX: number }) => {
    if (!drag.current) return;
    const signedDistance = (event.clientX - drag.current.startX) * (drag.current.direction === 'forward' ? -1 : 1);
    controller.setDrag(drag.current.direction, signedDistance / 260);
  };

  const handlePointerUp = () => {
    if (!drag.current) return;
    controller.releaseDrag();
    drag.current = undefined;
  };

  return (
    <>
      <PerspectiveCamera makeDefault fov={38} position={[0, -0.55, 5.2]} />
      <ambientLight intensity={0.72} />
      <directionalLight position={[3, -4, 5]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />
      <Environment preset="studio" environmentIntensity={0.25} />
      <group ref={group} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
        <Spine />
        <Cover url={backCover.imageUrl} front={false} />
        <PageStack side="left" count={controller.spread * 2} />
        <PageStack side="right" count={Math.max(0, innerPages.length - controller.spread * 2)} />
        {controller.coverOpen > 0.98 && leftPage && <Page page={leftPage} side="left" />}
        {controller.coverOpen > 0.98 && rightPage && <Page page={rightPage} side="right" />}
        {controller.status.startsWith('TURNING') && activeFront && (
          <TurningPage
            front={activeFront}
            back={activeBack}
            progress={controller.turnProgress}
            direction={controller.direction === 'forward' ? 1 : -1}
          />
        )}
        <Cover url={cover.imageUrl} front open={controller.coverOpen} onClick={() => controller.open()} />
      </group>
      <mesh receiveShadow position={[0, 0, -0.13]}>
        <boxGeometry args={[4.7, 3.35, 0.035]} />
        <shadowMaterial opacity={0.18} />
      </mesh>
    </>
  );
}

export function BookCanvas({ pages, controller }: { pages: PortfolioPage[]; controller: BookController }) {
  return (
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, powerPreference: 'high-performance' }}>
      <Suspense fallback={null}>
        <Scene pages={pages} controller={controller} />
      </Suspense>
    </Canvas>
  );
}
