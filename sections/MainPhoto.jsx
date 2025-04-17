'use client';

import { motion } from 'framer-motion';
import styles from '../styles';
import { slideIn, staggerContainer, textVariant } from '../utils/motion';

const MainPhoto = () => (
  <section className={`${styles.yPaddings} sm:pl-16 pl-5`}>
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, amount: 0.25 }}
      className={`${styles.innerWidth} mx-auto flex flex-col`}
    >
      <div className="flex justify-center items-center flex-col relative z-10">
        {/* <motion.h1 variants={textVariant(1.1)} className={styles.heroHeading}>
Welcome        </motion.h1> */}
  
      </div>

      <motion.div
        variants={slideIn('right', 'tween', 0.2, 1)}
        className="relative w-full md:-mt-[20px] -mt-[12px]"
      >
        {/* <div className="absolute w-full h-[300px] hero-gradient rounded-tl-[140px] z-[0] -top-[30px]" /> */}

        <img
          src="/christie-karaoke.png"
          alt="hero_cover"
          className="w-full sm:h-full h-full object-cover rounded-tl-[120px] z-10 relative"
        />

<a
  href="https://wearethekkaraoke.as.me/schedule/6914a657"
  className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-[#f5d07e] hover:bg-[#e5be67] text-black font-bold py-3 px-8 rounded-full shadow-md transition duration-300 z-20"
>
  Reserve A Room
</a>

      </motion.div>
    </motion.div>
  </section>
);

export default MainPhoto;
