/* eslint-disable no-undef */
/* eslint-disable react/no-unknown-property */
import { OrbitControls, Preload, Stats } from '@react-three/drei';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { Suspense, useState } from 'react';
import { Perf } from 'r3f-perf';
import { Vector3 } from 'three';
import { Model } from './components/highPollyTestHeadphone';
import {
  noTransparencyDarkShader,
  // noTransparencyWhiteShader,
  // transparencyDarkShader,
  // transparencyWhiteShader,
} from './shaders';

interface ObjectUserData {
  name: string;
  description: string;
}
export default function App() {
  const initialUserData: ObjectUserData = {
    description: '',
    name: '',
  };
  const [hovered, setHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [userData, setUserData] = useState<ObjectUserData>(initialUserData);
  const handleHovered = (
    isHovered: boolean,
    event?: ThreeEvent<PointerEvent>,
  ) => {
    setHovered(isHovered);
    if (event) {
      setMousePos({ x: event.clientX, y: event.clientY });
      setUserData({
        name: event.object.userData.customName,
        description: event.object.userData.customDescription,
      });
    }
  };
  return (
    <div style={{ position: 'relative' }}>
      <h1>hola</h1>
      <p>p</p>
      <Canvas style={{ background: 'black' }}>
        <OrbitControls />
        <Stats />
        <Perf position={[10, 10, 10]} deepAnalize />
        <directionalLight color="white" />
        <Suspense>
          <Model
            handleHovered={handleHovered}
            hovered={hovered}
            position={new Vector3(0, 0, 0)}
            fragmentShader={noTransparencyDarkShader}
          />
          <Preload all />
        </Suspense>
      </Canvas>
      {hovered && (
        <div
          style={{
            position: 'absolute',
            top: mousePos.y + 10, // Adding some offset
            left: mousePos.x + 10, // Adding some offset
            background: 'white',
            padding: '5px',
            borderRadius: '3px',
            pointerEvents: 'none', // Prevent blocking mouse events
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <p>{userData.name}</p>
          <p>{userData.description}</p>
        </div>
      )}
    </div>
  );
}
