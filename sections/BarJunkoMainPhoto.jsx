'use client';

import { motion } from 'framer-motion';
import styles from '../styles';
import { slideIn, staggerContainer } from '../utils/motion';
import Image from 'next/image';
import barjunkoOpenCover from '../public/barjunkoOpenCover.png';

const BarJunkoMainPhoto = () => (
  <section className={`${styles.yPaddings} sm:px-16 px-5`}>
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, amount: 0.25 }}
      className="max-w-6xl mx-auto flex flex-col items-center"
    >
      {/* Top Space */}
      <div className="h-8 sm:h-12" />

      <motion.div
        variants={slideIn('left', 'tween', 0.2, 1)}
        className="relative w-full"
      >
        <div className="relative w-[90%] max-w-[900px] mx-auto">
          <Image
            src={barjunkoOpenCover}
            alt="hero_cover"
            className="object-cover rounded-tl-[100px] z-10"
            placeholder="blur"
            sizes="(max-width: 768px) 90vw, 900px"
            style={{ width: '100%', height: 'auto' }}
          />

          <a
            href="https://wearethekkaraoke.as.me/schedule/6914a657"
            className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 bg-[#f5d07e] hover:bg-[#e5be67] text-black font-bold py-3 px-8 rounded-full shadow-md transition duration-300 z-20"
          >
            Reserve A Room
          </a>
        </div>
      </motion.div>

      {/* Bottom Space */}
      <div className="h-12 sm:h-16" />
    </motion.div>
  </section>
);

export default BarJunkoMainPhoto;
