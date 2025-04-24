'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import styles from '../styles';
import { slideIn, staggerContainer } from '../utils/motion';

const Hero = () => (
  <section className="w-full h-screen overflow-hidden relative bg-black">
    {/* Top Center Logo */}
    <div className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 z-20">
      <img
        src="/k-karaoke-logo.png"
        alt="K Karaoke Logo"
        className="w-28 sm:w-40 h-auto object-contain"
      />
    </div>

    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, amount: 0.25 }}
      className="flex w-full h-full"
    >
      {/* Left Side Image */}
      <motion.div
        variants={slideIn('left', 'tween', 0.2, 1)}
        className="relative w-1/2 h-full min-w-[50%]"
      >
        <img
          src="/TheKkaraoke_cover.png"
          alt="hero_left"
          className="absolute inset-0 w-full h-full object-cover object-[8%_center] md:object-top"
        />
        <Link
          href="/christie"
          className="absolute bottom-28 sm:bottom-12 left-1/2 -translate-x-1/2 bg-black text-white py-2 px-5 sm:py-3 sm:px-6 rounded-full text-sm sm:text-lg hover:opacity-80 transition z-10"
        >
          ← 699 Bloor St. West
        </Link>
      </motion.div>

      {/* Right Side Image */}
      <motion.div
        variants={slideIn('right', 'tween', 0.2, 1)}
        className="relative w-1/2 h-full min-w-[50%]"
      >
        <img
          src="/barjunkocover.png"
          alt="hero_right"
          className="absolute inset-0 w-full h-full object-cover object-[65%_center] sm:object-center"
        />
        <a
          href="/barjunko"
          className="absolute bottom-28 sm:bottom-12 left-1/2 -translate-x-1/2 bg-green-500 text-white py-2 px-5 sm:py-3 sm:px-6 rounded-full text-sm sm:text-lg hover:opacity-80 transition z-10"
        >
          675 Yonge St →
        </a>
      </motion.div>
    </motion.div>

    {/* Footer */}
    <div className="absolute bottom-2 sm:bottom-4 w-full text-center text-white text-xs sm:text-sm tracking-wide z-10">
      © 2025 The K Karaoke
    </div>
  </section>
);

export default Hero;
