'use client';

import { useRef, useState, useEffect } from 'react';
import styles from '../styles';
import { smallList } from '../constants';
import { MenuCard, TypingText } from '../components';

const Menu = () => {
  const [active, setActive] = useState(smallList[1]?.id || null); // Set second image active by default
  const scrollContainerRef = useRef(null);
  const cardRefs = useRef({});

  const handleCardClick = (id) => {
    setActive(id);

    const cardElement = cardRefs.current[id];
    const container = scrollContainerRef.current;

    if (window.innerWidth < 640 && cardElement && container) {
      const cardRect = cardElement.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const offset =
        cardRect.left -
        containerRect.left -
        (containerRect.width / 2 - cardRect.width / 2);

      container.scrollTo({
        left: container.scrollLeft + offset,
        behavior: 'smooth',
      });
    }
  };

  // Scroll to the second image on initial load (mobile only)
  useEffect(() => {
    const initialId = smallList[1]?.id;
    const cardElement = cardRefs.current[initialId];
    const container = scrollContainerRef.current;

    if (window.innerWidth < 640 && cardElement && container) {
      const cardRect = cardElement.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const offset =
        cardRect.left -
        containerRect.left -
        (containerRect.width / 2 - cardRect.width / 2);

      container.scrollTo({
        left: container.scrollLeft + offset,
        behavior: 'smooth',
      });
    }
  }, []);

  return (
    <section className={`${styles.paddings}`} id="menu">
    <div className="flex justify-center items-center gap-4 px-4 mb-6">
  <TypingText
    title="| Small Room"
    textStyles="text-[20px] sm:text-[28px] font-semibold"
  />
  <button
    className="bg-white/10 text-white text-sm sm:text-base px-4 py-2 rounded-lg hover:bg-white/20 transition"
    onClick={() => console.log("Reserve Small Room")}
  >
    Reserve
  </button>
</div>

      <div className={`${styles.innerWidth} mx-auto flex flex-col`}>
      <div
  ref={scrollContainerRef}
  className="flex gap-2 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide px-4"
>
  {smallList.map((item) => (
    <MenuCard
      key={item.id}
      id={item.id}
      imgUrl={item.imgUrl}
      active={active}
      handleClick={() => handleCardClick(item.id)}
      scrollContainerRef={scrollContainerRef}
    />
  ))}
</div>

      </div>
    </section>
  );
};

export default Menu;
