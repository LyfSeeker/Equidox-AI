"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function EquidoxOrb() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 6.4);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.45, 3),
      new THREE.MeshBasicMaterial({
        color: 0xdeff3b,
        wireframe: true,
        transparent: true,
        opacity: 0.42,
      })
    );
    group.add(core);

    const inner = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.08, 2),
      new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        wireframe: true,
        transparent: true,
        opacity: 0.2,
      })
    );
    group.add(inner);

    const orbitMaterial = new THREE.MeshBasicMaterial({
      color: 0xdeff3b,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
    });
    const rings = [
      new THREE.Mesh(new THREE.TorusGeometry(2, 0.008, 8, 160), orbitMaterial),
      new THREE.Mesh(new THREE.TorusGeometry(2.34, 0.006, 8, 160), orbitMaterial),
      new THREE.Mesh(new THREE.TorusGeometry(2.68, 0.004, 8, 160), orbitMaterial),
    ];
    rings[0].rotation.x = Math.PI / 2.7;
    rings[1].rotation.set(Math.PI / 2.15, 0.4, 0.2);
    rings[2].rotation.set(Math.PI / 1.8, -0.4, 0.6);
    rings.forEach((ring) => group.add(ring));

    const particleCount = 520;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      const radius = 2.8 + Math.random() * 2.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: 0x9ca3af,
        size: 0.018,
        transparent: true,
        opacity: 0.48,
        sizeAttenuation: true,
      })
    );
    scene.add(particles);

    const pointer = new THREE.Vector2();
    let targetX = 0;
    let targetY = 0;
    const onPointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      targetX = pointer.y * 0.28;
      targetY = pointer.x * 0.42;
    };
    mount.addEventListener("pointermove", onPointerMove);

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    resize();

    const clock = new THREE.Clock();
    let frame = 0;
    const render = () => {
      const elapsed = clock.getElapsedTime();
      if (!reduceMotion) {
        group.rotation.x += (targetX - group.rotation.x) * 0.035;
        group.rotation.y += (targetY - group.rotation.y) * 0.035;
        core.rotation.z = elapsed * 0.08;
        inner.rotation.z = -elapsed * 0.12;
        rings[0].rotation.z = elapsed * 0.08;
        rings[1].rotation.z = -elapsed * 0.055;
        rings[2].rotation.z = elapsed * 0.035;
        particles.rotation.y = elapsed * 0.012;
      }
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
      mount.removeEventListener("pointermove", onPointerMove);
      core.geometry.dispose();
      inner.geometry.dispose();
      rings.forEach((ring) => ring.geometry.dispose());
      orbitMaterial.dispose();
      particleGeometry.dispose();
      (particles.material as THREE.Material).dispose();
      (core.material as THREE.Material).dispose();
      (inner.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="h-full min-h-0 w-full"
      aria-hidden="true"
    />
  );
}
