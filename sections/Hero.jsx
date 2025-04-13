'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import styles from '../styles';
import { slideIn, staggerContainer } from '../utils/motion';

const Hero = () => (
  <section className="w-full h-screen flex relative">
    {/* Top Center Logo */}
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
      <img
        src="/k-karaoke-logo.png" // Make sure this path matches your /public folder
        alt="K Karaoke Logo"
        className="w-40 h-auto object-contain"
      />
    </div>

    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, amount: 0.25 }}
      className="flex w-full h-full"
    >
      {/* Left side image */}
      <motion.div
        variants={slideIn('left', 'tween', 0.2, 1)}
        className="w-1/2 h-full relative"
      >
        <img
          src="/TheKkaraoke_cover.png"
          alt="hero_left"
          className="w-full h-full object-cover object-top"
        />
        <Link
          href="/christie"
          className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-black text-white py-3 px-6 rounded-full text-lg hover:opacity-80 transition"
        >
          ← Christie/Korean Town
        </Link>
      </motion.div>

      {/* Right side image */}
      <motion.div
        variants={slideIn('right', 'tween', 0.2, 1)}
        className="w-1/2 h-full relative"
      >
        <img
          src="/barjunkocover.png"
          alt="hero_right"
          className="w-full h-full object-cover object-center"
        />
        <a
          href="#BloorWest"
          className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-green-500 text-white py-3 px-6 rounded-full text-lg hover:opacity-80 transition"
        >
          Bloor and Yonge →
        </a>
      </motion.div>
    </motion.div>

    {/* Bottom footer text */}
    <div className="absolute bottom-4 w-full text-center text-white text-sm tracking-wide">
      © 2025 The K Karaoke
    </div>
  </section>
);

export default Hero;
