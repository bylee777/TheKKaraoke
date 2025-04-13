'use client';

import { motion } from 'framer-motion';
import styles from '../styles';
import { slideIn, staggerContainer, textVariant } from '../utils/motion';

const Christie = () => (
  <section
    className={`bg-primary-black overflow-hidden ${styles.yPaddings} sm:pl-16 pl-5`}
  >
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, amount: 0.25 }}
      className={`${styles.innerWidth} mx-auto flex flex-col`}
    >
      {/* Optional heading (you can enable if needed) */}
      <div className="flex justify-center items-center flex-col relative z-10 mb-8">
        {/* <motion.h1 variants={textVariant(1.1)} className={styles.heroHeading}>
          Christie / Korean Town
        </motion.h1> */}
      </div>

      {/* Animated and rounded image */}
      <motion.div
        variants={slideIn('right', 'tween', 0.2, 1)}
        className="relative w-full md:-mt-[20px] -mt-[12px] overflow-hidden rounded-[40px] shadow-xl"
      >
        <img
          src="/christie-karaoke.png"
          alt="Christie Karaoke"
          className="w-full h-full object-cover"
        />
      </motion.div>
    </motion.div>
  </section>
);

export default Christie;
