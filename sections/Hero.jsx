'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { slideIn, staggerContainer } from '../utils/motion';

const Hero = () => (
  <section className="w-full h-screen overflow-hidden relative bg-neutral-900 flex flex-col justify-between">
    {/* Top Center Logo */}
    <div className="pt-4 sm:pt-6 text-center">
      <img
        src="/k-karaoke-logo.png"
        alt="K Karaoke Logo"
        className="w-24 sm:w-32 mx-auto"
      />
    </div>

    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, amount: 0.25 }}
      className="flex flex-col sm:flex-row items-center justify-evenly flex-grow w-full px-4"
    >
      {/* Left Circle + Button */}
      <motion.div
        variants={slideIn('left', 'tween', 0.2, 1)}
        className="flex flex-col items-center"
      >
        <div className="relative w-56 h-56 sm:w-72 sm:h-72 rounded-full overflow-hidden bg-[#2e1e12] shadow-lg">
          <Image
            src="/TheKkaraoke_cover.png"
            alt="The K Karaoke"
            fill
            className="object-cover"
            priority
          />
        </div>
        <Link
          href="/christie"
          className="mt-3 sm:mt-5 bg-blue-800 text-white py-2 px-4 sm:py-3 sm:px-6 rounded-full text-xs sm:text-sm hover:opacity-80 transition"
        >
          ← Christie: 699 Bloor St. West
        </Link>
      </motion.div>

      {/* Right Circle + Button */}
      <motion.div
        variants={slideIn('right', 'tween', 0.2, 1)}
        className="flex flex-col items-center"
      >
        <div className="relative w-56 h-56 sm:w-72 sm:h-72 rounded-full overflow-hidden bg-[#0f2233] shadow-lg">
          <Image
            src="/barjunkocover.png"
            alt="Bar Junko"
            fill
            className="object-cover"
            priority
          />
        </div>
        <a
          href="/barjunko"
          className="mt-3 sm:mt-5 bg-green-500 text-white py-2 px-4 sm:py-3 sm:px-6 rounded-full text-xs sm:text-sm hover:opacity-80 transition"
        >
          Bloor/Yonge: 675 Yonge St →
        </a>
      </motion.div>
    </motion.div>

    {/* Footer */}
    <div className="pb-2 sm:pb-4 text-center text-white text-[10px] sm:text-xs tracking-wide">
      © 2025 The K Karaoke
    </div>
  </section>
);

export default Hero;
