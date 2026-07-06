"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// Hero WebGL — « de la poussière à l'étoile » : un champ de particules qui
// s'élève (poussière corail → étoile or), profondeur par brouillard + parallaxe
// souris. Respecte prefers-reduced-motion, se met en pause hors écran, nettoie
// tout au démontage, et se retire silencieusement si WebGL est indisponible.
export default function HeroCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      return; // pas de WebGL → le dégradé CSS de repli reste visible
    }

    const w = () => mount.clientWidth || 1;
    const h = () => mount.clientHeight || 1;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0c0a08, 0.05);
    const camera = new THREE.PerspectiveCamera(62, w() / h(), 0.1, 120);
    camera.position.set(0, 1, 19);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(w(), h());
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // Sprite lumineux (dégradé radial) partagé par les particules et l'étoile.
    const sprite = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d")!;
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, "rgba(255,255,255,1)");
      grd.addColorStop(0.35, "rgba(255,238,214,0.85)");
      grd.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();

    const COUNT = window.innerWidth < 640 ? 1500 : 2800;
    const RX = 30, RY = 28, RZ = 18;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    const cDust = new THREE.Color(0xe56458);
    const cWarm = new THREE.Color(0xf2a44f);
    const cStar = new THREE.Color(0xfef7d8);
    for (let i = 0; i < COUNT; i++) {
      const x = (Math.random() - 0.5) * RX;
      const y = (Math.random() - 0.5) * RY;
      const z = (Math.random() - 0.5) * RZ;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      const t = (y + RY / 2) / RY; // 0 bas (poussière) → 1 haut (étoile)
      const col = t < 0.5 ? cDust.clone().lerp(cWarm, t * 2) : cWarm.clone().lerp(cStar, (t - 0.5) * 2);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
      speeds[i] = 0.35 + Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.22,
      map: sprite,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // L'étoile — destination lumineuse vers le haut.
    const starMat = new THREE.SpriteMaterial({ map: sprite, color: 0xfff2cf, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const star = new THREE.Sprite(starMat);
    star.scale.set(7, 7, 1);
    star.position.set(4, 10, -3);
    scene.add(star);

    let mx = 0, my = 0;
    const onMove = (e: PointerEvent) => {
      const r = mount.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width - 0.5;
      my = (e.clientY - r.top) / r.height - 0.5;
    };
    mount.addEventListener("pointermove", onMove);
    const onResize = () => {
      camera.aspect = w() / h();
      camera.updateProjectionMatrix();
      renderer.setSize(w(), h());
    };
    window.addEventListener("resize", onResize);

    const pos = geo.attributes.position as THREE.BufferAttribute;
    const clock = new THREE.Clock();
    let raf = 0;
    let running = true;

    const frame = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      for (let i = 0; i < COUNT; i++) {
        let y = pos.getY(i) + (speeds[i] ?? 0.5) * dt * 1.15;
        if (y > RY / 2) y = -RY / 2;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
      points.rotation.y += dt * 0.03;
      camera.position.x += (mx * 3.2 - camera.position.x) * 0.045;
      camera.position.y += (1 - my * 2 - camera.position.y) * 0.045;
      camera.lookAt(0, 1.5, 0);
      starMat.opacity = 0.55 + Math.sin(clock.elapsedTime * 1.4) * 0.18;
      renderer.render(scene, camera);
      if (running) raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e || reduce) return;
        if (e.isIntersecting && !running) {
          running = true;
          clock.getDelta();
          raf = requestAnimationFrame(frame);
        } else if (!e.isIntersecting) {
          running = false;
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0 },
    );
    io.observe(mount);

    if (reduce) renderer.render(scene, camera);
    else raf = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", onResize);
      mount.removeEventListener("pointermove", onMove);
      geo.dispose();
      mat.dispose();
      sprite.dispose();
      starMat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} aria-hidden className="absolute inset-0 h-full w-full" />;
}
