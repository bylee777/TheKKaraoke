'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { slideIn, staggerContainer } from '../utils/motion';

const Hero = () => (
  <section className="w-full h-screen overflow-hidden relative bg-black">
    {/* Top Center Logo */}
    <div className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 z-30">
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
      className="flex flex-col sm:flex-row w-full h-full"
    >
      {/* Left Image + Centered Button */}
      <motion.div
        variants={slideIn('left', 'tween', 0.2, 1)}
        className="relative w-full sm:w-1/2 h-full flex items-center justify-center"
      >
        <Image
          src="/TheKkaraoke_cover.png"
          alt="hero_left"
          fill
          priority
          sizes="100vw sm:50vw"
          className="object-cover object-[8%_center] md:object-top"
        />
        <Link
          href="/christie"
          className="absolute bg-blue-800 text-white py-3 px-6 sm:py-4 sm:px-8 rounded-full text-sm sm:text-lg hover:opacity-80 transition text-center z-20"
        >
          ← Christie: 699 Bloor St. West
        </Link>
      </motion.div>

      {/* Right Image + Centered Button */}
      <motion.div
        variants={slideIn('right', 'tween', 0.2, 1)}
        className="relative w-full sm:w-1/2 h-full flex items-center justify-center"
      >
        <Image
          src="/barjunkocover.png"
          alt="hero_right"
          fill
          priority
          sizes="100vw sm:50vw"
          className="object-cover object-[65%_center] sm:object-center"
        />
        <a
          href="/barjunko"
          className="absolute bg-green-500 text-white py-3 px-6 sm:py-4 sm:px-8 rounded-full text-sm sm:text-lg hover:opacity-80 transition text-center z-20"
        >
          Bloor/Yonge: 675 Yonge St →
        </a>
      </motion.div>
    </motion.div>

    {/* Footer */}
    <div className="absolute bottom-2 sm:bottom-4 w-full text-center text-white text-[10px] sm:text-xs tracking-wide z-10">
      © 2025 The K Karaoke
    </div>
  </section>
);

export default Hero;
