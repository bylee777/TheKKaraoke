'use client';

import BarNav from '../components/BarNav';
import BarJunkoMainPhoto from '../sections/BarJunkoMainPhoto';
import AboutJunko from '../sections/AboutJunko';
import BarSmallRoom from '../sections/BarSmallRoom';
import MediumBarRoom from '../sections/MediumBarRoom';
import LargeBarRoom from '../sections/LargeBarRoom';
import BarFooter from '../components/BarFooter';

const Barjunko = () => (
  <div className="bg-primary-black overflow-hidden">
    <BarNav />
    <BarJunkoMainPhoto />
    <div className="relative">
      <AboutJunko />
      <BarSmallRoom />
      <MediumBarRoom />
      <LargeBarRoom />
    </div>
    <div className="relative" />
    <BarFooter />
  </div>
);

export default Barjunko;
