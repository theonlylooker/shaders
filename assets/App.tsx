/* eslint-disable no-undef */
/* eslint-disable react/no-unknown-property */
import { OrbitControls, useGLTF, Preload } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
// import { Mesh, MeshStandardMaterial } from 'three';
// import Tractor from '../../assets/tractor.glb';
import { Mesh, MeshStandardMaterial } from 'three';
import { GLTF } from 'three-stdlib';
import Car from '../../assets/car_trailer_the_chariot.glb';
// type TractorGLTFResult = GLTF & {
//   nodes: {
//     Mesh_body: Mesh;
//     Mesh_body_1: Mesh;
//     Mesh_body_2: Mesh;
//     Mesh_body_3: Mesh;
//     Mesh_body_4: Mesh;
//     Mesh_wheel_backLeft: Mesh;
//     Mesh_wheel_backLeft_1: Mesh;
//     Mesh_wheel_backLeft_2: Mesh;
//     Mesh_wheel_frontRight: Mesh;
//     Mesh_wheel_frontRight_1: Mesh;
//     body: Mesh;
//     skirts: Mesh;
//     tractor: Mesh;
//     wheel_backLeft: Mesh;
//     wheel_backRight: Mesh;
//     wheel_frontLeft: Mesh;
//     wheel_frontRight: Mesh;
//   };
//   materials: {
//     carTire: MeshStandardMaterial;
//     lightFront: MeshStandardMaterial;
//     paintBlue: MeshStandardMaterial;
//     paintYellow: MeshStandardMaterial;
//     plastic: MeshStandardMaterial;
//     window: MeshStandardMaterial;
//     _defaultMat: MeshStandardMaterial;
//   };
// };

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const fragmentShader = `
   uniform sampler2D uTexture;
   varying vec2 vUv;

 void main() {
   vec4 color = texture2D(uTexture, vUv);
   // Apply custom effects to the color here
   gl_FragColor = color;
 }

`;

export function Model() {
  // const { scene, nodes, materials } = useGLTF(
  //   Tractor,
  // ) as unknown as TractorGLTFResult;
  // console.log({ scene });
  type Car = GLTF & {
    nodes: {
      Object_4: Mesh;
      Object_6: Mesh;
      Object_8: Mesh;
    };
    materials: {
      wheels: MeshStandardMaterial;
    };
  };
  const { scene, nodes, materials } = useGLTF(Car) as Car;
  // const uniforms = useMemo(
  //   () => ({
  //     uTexture: {
  //       value: new TextureLoader().load(''),
  //     },
  //   }),
  //   [],
  // );
  console.log({ scene, nodes, materials });

  // eslint-disable-next-line react/no-unknown-property
  // return <primitive object={scene} />;

  return (
    <group dispose={null}>
      <mesh
        castShadow
        receiveShadow
        // geometry={nodes.Object_4.geometry}
        // material={materials.wheels}
      >
        <bufferGeometry {...nodes.Object_4.geometry} />
        {/* <meshStandardMaterial {...materials.wheels} /> */}
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={{ uTexture: { value: materials.wheels.map } }}
        />
      </mesh>
      {/* <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_6.geometry}
        material={materials['Material.002']}
      /> */}
      {/* <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_8.geometry}
        material={materials.Body}
      /> */}
    </group>
  );
  // return <primitive object={scene} />;
}

export default function App() {
  return (
    <>
      <h1>hola</h1>
      <p>p</p>
      <Canvas style={{ background: 'gray' }}>
        <OrbitControls />
        <directionalLight color="white" />
        <Suspense>
          <Model />
          <Preload all />
        </Suspense>
      </Canvas>
    </>
  );
}
