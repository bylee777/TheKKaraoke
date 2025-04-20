'use client';

import { Navbar, Footer } from '../components';
import MainPhoto from '../sections/MainPhoto';
import About from '../sections/About';
import Menu from '../sections/Menu';
import MediumRoom from '../sections/mediumRoom';
import LargeRoom from '../sections/LargeRoom';

const Christie = () => (
  <div className="bg-primary-black overflow-hidden">
    <Navbar />
    <MainPhoto />
    <div className="relative">
      <About />
      <Menu />
      <MediumRoom />
      <LargeRoom />
    </div>
    <div className="relative" />
    <Footer />
  </div>
);

export default Christie;
