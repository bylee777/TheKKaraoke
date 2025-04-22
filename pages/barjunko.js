'use client';

import Menu from '../sections/Menu';
import MediumRoom from '../sections/mediumRoom';
import LargeRoom from '../sections/LargeRoom';
import BarNav from '../components/BarNav';
import BarJunkoMainPhoto from '../sections/BarJunkoMainPhoto';
import AboutJunko from '../sections/AboutJunko';

const Barjunko = () => (
  <div className="bg-primary-black overflow-hidden">
    <BarNav />
    <BarJunkoMainPhoto />
    <div className="relative">
      <AboutJunko />
      <Menu />
      <MediumRoom />
      <LargeRoom />
    </div>
    <div className="relative" />
    {/* <Footer /> */}
  </div>
);

export default Barjunko;
