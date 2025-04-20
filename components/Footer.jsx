'use client';

import { motion } from 'framer-motion';
import styles from '../styles';
import { footerVariants } from '../utils/motion';

const Footer = () => (
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
          href="https://www.google.ca/maps/place/The+K+Karaoke/@43.6636047,-79.4200317,17z/data=!3m1!4b1!4m6!3m5!1s0x882b35d750e84b21:0x8de3f68dadf18aad!8m2!3d43.6636008!4d-79.4174568!16s%2Fg%2F11jfm11y65?entry=ttu&g_ep=EgoyMDI1MDQxNi4xIKXMDSoASAFQAw%3D%3D"
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
          {/* Logo image */}
          <img
            src="/logo1.png"
            alt="The K Karaoke"
            className="w-[64px] h-[64px] object-contain"
          />

          <p className="font-normal text-[14px] text-white opacity-50">
            Copyright © 2025 The K Karaoke. All rights reserved.
          </p>

          {/* Keep only Instagram and Facebook */}
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

export default Footer;
