/* eslint-disable no-undef */
/* eslint-disable react/no-unknown-property */
import { useGLTF } from '@react-three/drei';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {} from 'r3f-perf';
import {
  Mesh,
  MeshStandardMaterial,
  Group,
  Vector3,
  MathUtils,
  ShaderMaterial,
} from 'three';
import { GLTF } from 'three-stdlib';
import highPollyHeadphone from '../../../headphones_high_polly.glb';
import { vertexShader } from '../shaders';

type HeadphonesGLTFResult = GLTF & {
  nodes: {
    Object_4: Mesh;
    Object_6: Mesh;
    Object_7: Mesh;
    Object_8: Mesh;
    Object_9: Mesh;
    Object_10: Mesh;
    Object_12: Mesh;
    Object_14: Mesh;
    Object_16: Mesh;
    Object_18: Mesh;
    Object_20: Mesh;
    Object_21: Mesh;
    Object_23: Mesh;
    Object_25: Mesh;
  };
  materials: {
    FRONT_MAT: MeshStandardMaterial;
    SIDE_MAT: MeshStandardMaterial;
    black_leather: MeshStandardMaterial;
    brushed_steel: MeshStandardMaterial;
    inside: MeshStandardMaterial;
    leather_top: MeshStandardMaterial;
    side_logo: MeshStandardMaterial;
  };
};
interface ModelProps {
  handleHovered: (isHovered: boolean, event?: ThreeEvent<PointerEvent>) => void;
  hovered: boolean;
  position: Vector3 | undefined;
  fragmentShader: string | undefined;
}

// eslint-disable-next-line import/prefer-default-export
export function Model({
  handleHovered,
  hovered,
  position,
  fragmentShader,
}: ModelProps) {
  const { nodes, materials } = useGLTF(
    highPollyHeadphone,
  ) as unknown as HeadphonesGLTFResult;
  const groupRef = useRef<Group | null>(null);
  const shaderMaterialRef = useRef<ShaderMaterial | null>(null);

  const uniforms = useMemo(
    () => ({
      uAmbientLight: { value: [0.1, 0.1, 0.1] },
      uSpotLightColor1: { value: [1.0, 1.0, 1.0] },
      uSpotLightColor2: { value: [1.0, 1.0, 1.0] },
      uSpotLightPosition1: { value: new Vector3(5, 5, 5) },
      uSpotLightPosition2: { value: new Vector3(-5, 5, 5) },
      uSpotLightDirection1: { value: new Vector3(-1, -1, -1) },
      uSpotLightDirection2: { value: new Vector3(1, -1, -1) },
      uSpotLightCutoff1: { value: Math.cos(MathUtils.degToRad(30)) },
      uSpotLightCutoff2: { value: Math.cos(MathUtils.degToRad(30)) },
      pixelSize: { value: 10.0 }, // pixel size for the dithering effect
      uHovered: { value: false },
    }),
    [],
  );
  useFrame(() => {
    if (groupRef.current && !hovered) {
      groupRef.current.rotation.z -= 0.008; // Adjust the rotation speed as needed
    }
  });

  const onPointerEnter = (e: ThreeEvent<PointerEvent>) => {
    if (shaderMaterialRef.current) {
      shaderMaterialRef.current.uniforms.uHovered = { value: false };
    }
    shaderMaterialRef.current = (e.object as Mesh).material as ShaderMaterial;
    if (shaderMaterialRef.current)
      shaderMaterialRef.current.uniforms.uHovered = { value: true };
    handleHovered(true, e);
  };
  const onPointerLeave = () => {
    handleHovered(false);
    if (shaderMaterialRef.current)
      shaderMaterialRef.current.uniforms.uHovered = { value: false };
    shaderMaterialRef.current = null;
  };
  return (
    <group
      ref={groupRef}
      dispose={null}
      position={position}
      scale={0.3}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_4.geometry}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        userData={{
          customName: 'object_4',
          customDescription: 'this is a metallic part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_6.geometry}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        userData={{
          customName: 'object_6',
          customDescription: 'this is a metallic base',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.SIDE_MAT.map },
              uColor: { value: materials.SIDE_MAT.color },
              uRoughness: { value: materials.SIDE_MAT.roughness },
              uMetalness: { value: materials.SIDE_MAT.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_7.geometry}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        userData={{
          customName: 'object_7',
          customDescription: 'this is some leather',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.black_leather.map },
              uColor: { value: materials.black_leather.color },
              uRoughness: { value: materials.black_leather.roughness },
              uMetalness: { value: materials.black_leather.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_8.geometry}
        userData={{
          customName: 'object_8',
          customDescription: 'this is a metallic part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_9.geometry}
        userData={{
          customName: 'object_9',
          customDescription: 'this is a front part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.FRONT_MAT.map },
              uColor: { value: materials.FRONT_MAT.color },
              uRoughness: { value: materials.FRONT_MAT.roughness },
              uMetalness: { value: materials.FRONT_MAT.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_10.geometry}
        userData={{
          customName: 'object_10',
          customDescription: 'this is an inside part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.inside.map },
              uColor: { value: materials.inside.color },
              uRoughness: { value: materials.inside.roughness },
              uMetalness: { value: materials.inside.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_12.geometry}
        userData={{
          customName: 'object_12',
          customDescription: 'this is metallic part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_14.geometry}
        userData={{
          customName: 'object_14',
          customDescription: 'this is another metallic part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_16.geometry}
        userData={{
          customName: 'object_16',
          customDescription: 'this is other metallic part',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_18.geometry}
        userData={{
          customName: 'object_18',
          customDescription: 'this is metallic',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.brushed_steel.map },
              uColor: { value: materials.brushed_steel.color },
              uRoughness: { value: materials.brushed_steel.roughness },
              uMetalness: { value: materials.brushed_steel.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_20.geometry}
        userData={{
          customName: 'object_20',
          customDescription: 'this is black leather',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.black_leather.map },
              uColor: { value: materials.black_leather.color },
              uRoughness: { value: materials.black_leather.roughness },
              uMetalness: { value: materials.black_leather.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_21.geometry}
        userData={{
          customName: 'object_21',
          customDescription: 'this is the top',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.leather_top.map },
              uColor: { value: materials.leather_top.color },
              uRoughness: { value: materials.leather_top.roughness },
              uMetalness: { value: materials.leather_top.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        geometry={nodes.Object_23.geometry}
        userData={{
          customName: 'object_23',
          customDescription: 'this is some black leather',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.black_leather.map },
              uColor: { value: materials.black_leather.color },
              uRoughness: { value: materials.black_leather.roughness },
              uMetalness: { value: materials.black_leather.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
      <mesh
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        castShadow
        receiveShadow
        geometry={nodes.Object_25.geometry}
        userData={{
          customName: 'object_25',
          customDescription: 'this is the side logo',
        }}
      >
        <shaderMaterial
          attach="material"
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={useMemo(
            () => ({
              ...uniforms,
              uTexture: { value: materials.side_logo.map },
              uColor: { value: materials.side_logo.color },
              uRoughness: { value: materials.side_logo.roughness },
              uMetalness: { value: materials.side_logo.metalness },
            }),
            [materials, uniforms],
          )}
        />
      </mesh>
    </group>
  );
}
