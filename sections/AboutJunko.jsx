'use client';

import { motion } from 'framer-motion';
import { TypingText } from '../components';

import styles from '../styles';
import { fadeIn, staggerContainer } from '../utils/motion';

const AboutJunko = () => (
  <section className={`${styles.paddings} relative z-10`}>

    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, amount: 0.25 }}
      className={`${styles.innerWidth} mx-auto ${styles.flexCenter} flex-col`}
    >
      <TypingText title="| About BarJunko" textStyles="text-center" />

      <motion.p
        variants={fadeIn('up', 'tween', 0.2, 1)}
        className="mt-[8px] font-normal sm:text-[32px] text-[20px] text-center text-secondary-white"
      >
        <span className="font-extrabold text-white">🎤 Welcome to BarJunko — Toronto’s Newest Karaoke Experience</span> BarJunko is a brand-new high-end karaoke bar bringing music, energy, and unforgettable moments to the heart of the city. Located at the iconic intersection of Bloor and Yonge, we’ve created the perfect space for nights that hit all the right notes.

Whether you’re celebrating with friends, vibing with coworkers, or just in the mood to sing your heart out, BarJunko offers private karaoke rooms, moody lighting, and an extensive multilingual song library that sets the stage for a night to remember.

✨ Come for the music, stay for the memories — BarJunko is your spotlight.
      </motion.p>

      <motion.img
        variants={fadeIn('up', 'tween', 0.3, 1)}
        src="/arrow-down.svg"
        alt="arrow down"
        className="w-[18px] h-[28px] object-contain mt-[28px]"
      />
    </motion.div>
  </section>
);

export default AboutJunko;
