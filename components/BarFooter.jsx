'use client';

import { motion } from 'framer-motion';
import styles from '../styles';
import { footerVariants } from '../utils/motion';

const BarFooter = () => (
  <motion.footer
    variants={footerVariants}
    initial="hidden"
    whileInView="show"
    className={`${styles.xPaddings} py-8 relative`}
  >
    <div className="footer-gradient" />

    <div className={`${styles.innerWidth} mx-auto flex flex-col gap-8`}>
      <div className="flex items-center justify-between flex-wrap gap-5">
        <h4 className="font-bold md:text-[64px] text-[44px] text-white">
          🌙 Your Night Out Starts Here
        </h4>

        <a
          href="https://www.google.com/maps/place/BAR+ZUNKO+%26+KARAOKE/@43.6689001,-79.3860455,21z/data=!4m6!3m5!1s0x882b35fe99caaabf:0xe1c1d39aba70344f!8m2!3d43.6688517!4d-79.3859879!16s%2Fg%2F11lzfw9b6x?entry=ttu&g_ep=EgoyMDI1MDQyMi4wIKXMDSoASAFQAw%3D%3D"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center"
        >
          <button
            type="button"
            className="flex items-center h-fit py-4 px-6 bg-[#25618B] rounded-[32px] gap-[12px]"
          >
            <img
              src="/map.png"
              alt="map icon"
              className="w-[50px] h-[50px] object-contain"
            />
          </button>
          <span className="text-white text-[12px] mt-1 opacity-80">
            Tap for Google Maps
          </span>
        </a>
      </div>

      <div className="flex flex-col">
        <div className="mb-[50px] h-[2px] bg-white opacity-10" />

        <div className="flex items-center justify-between flex-wrap gap-4">
          <img
            src="/logo1.png"
            alt="The K Karaoke"
            className="w-[64px] h-[64px] object-contain"
          />

          <p className="font-normal text-[14px] text-white opacity-50">
            Copyright © 2025 The K Karaoke. All rights reserved.
          </p>

          <div className="flex gap-4">
            <img
              src="/instagram.svg"
              alt="instagram"
              className="w-[24px] h-[24px] object-contain cursor-pointer"
            />
            <img
              src="/facebook.svg"
              alt="facebook"
              className="w-[24px] h-[24px] object-contain cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  </motion.footer>
);

export default BarFooter;
