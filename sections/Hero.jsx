'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { slideIn, staggerContainer } from '../utils/motion';

const Hero = () => (
  <section className="w-full h-screen overflow-hidden relative bg-neutral-900">
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
      className="flex flex-col sm:flex-row items-center justify-center w-full h-full gap-10 sm:gap-20 px-4"
    >
      {/* Left Circle Image + Button */}
      <motion.div
        variants={slideIn('left', 'tween', 0.2, 1)}
        className="flex flex-col items-center justify-center w-full sm:w-1/2"
      >
        <div className="relative w-72 h-72 sm:w-96 sm:h-96 rounded-full overflow-hidden shadow-xl bg-[#2e1e12] flex items-center justify-center">
          <Image
            src="/TheKkaraoke_cover.png"
            alt="The K Karaoke"
            fill
            priority
            className="object-cover"
          />
        </div>
        <Link
          href="/christie"
          className="mt-5 sm:mt-8 bg-blue-800 text-white py-3 px-6 sm:py-4 sm:px-8 rounded-full text-sm sm:text-lg hover:opacity-80 transition text-center"
        >
          ← Christie: 699 Bloor St. West
        </Link>
      </motion.div>

      {/* Right Circle Image + Button */}
      <motion.div
        variants={slideIn('right', 'tween', 0.2, 1)}
        className="flex flex-col items-center justify-center w-full sm:w-1/2"
      >
        <div className="relative w-72 h-72 sm:w-96 sm:h-96 rounded-full overflow-hidden shadow-xl bg-[#0f2233] flex items-center justify-center">
          <Image
            src="/barjunkocover.png"
            alt="Bar Junko"
            fill
            priority
            className="object-cover"
          />
        </div>
        <a
          href="/barjunko"
          className="mt-5 sm:mt-8 bg-green-500 text-white py-3 px-6 sm:py-4 sm:px-8 rounded-full text-sm sm:text-lg hover:opacity-80 transition text-center"
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
