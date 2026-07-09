"use client";

import React, { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";

function GridPoints() {
    const ref = useRef<THREE.Points>(null!);

    // Create a grid of points
    const [positions, setPositions] = useMemo(() => {
        const count = 3000;
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            // Create a larger horizontal grid for full-page coverage
            pos[i * 3] = (Math.random() - 0.5) * 40;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 6 - 3;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
        }
        return [pos, count];
    }, []);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        ref.current.rotation.y = t * 0.03;

        // Wave effect
        const array = ref.current.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length; i++) {
            const x = array[i * 3];
            const z = array[i * 3 + 2];
            array[i * 3 + 1] = Math.sin(x * 0.4 + t) * Math.cos(z * 0.4 + t) * 0.6 - 2;
        }
        ref.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
            <PointMaterial
                transparent
                color="#00D4AA" // Changed from #00E5FF to match GridPilot teal
                size={0.04}
                sizeAttenuation={true}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </Points>
    );
}

export default function ParticleBackground() {
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div className="fixed inset-0 z-0 pointer-events-none bg-[#05070A]">
            <Canvas camera={{ position: [0, 2, 12], fov: 45 }} dpr={[1, 2]}>
                <ambientLight intensity={0.5} />
                <GridPoints />
            </Canvas>

            {/* Background Glows (Persistent) */}
            <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-[#00D4AA]/10 blur-[140px] rounded-full" />
            <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-[#7C5CBF]/10 blur-[140px] rounded-full" />

            {/* Global Energy Network Lines */}
            <div className="absolute inset-0 opacity-10">
                {[...Array(8)].map((_, i) => (
                    <motion.div
                        key={i}
                        animate={{
                            pathLength: 1,
                            opacity: [0.3, 0.6, 0.3],
                            x: [-100, 100]
                        }}
                        transition={{
                            duration: 10 + i * 2,
                            repeat: Infinity,
                            ease: "linear",
                            delay: i * 1.5
                        }}
                        style={{
                            position: 'absolute',
                            top: `${10 + i * 12}%`,
                            left: -200,
                            right: -200,
                            height: '1px',
                            background: `linear-gradient(90deg, transparent, ${i % 2 === 0 ? '#00D4AA' : '#7C5CBF'}, transparent)`,
                            boxShadow: `0 0 15px ${i % 2 === 0 ? '#00D4AA' : '#7C5CBF'}`,
                            // Parallax effect
                            transform: `translateY(${scrollY * (0.05 + i * 0.01)}px)`
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
