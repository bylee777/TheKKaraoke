'use client';

import { Navbar } from '../components';
import MainPhoto from '../sections/MainPhoto';
import About from '../sections/About';
import Menu from '../sections/Menu';

const Christie = () => (
  <div className="bg-primary-black overflow-hidden">
    <Navbar />
    <MainPhoto />
    <div className="relative">
      <About />
      <Menu />
    </div>
    <div className="relative" />
  </div>
);

export default Christie;
