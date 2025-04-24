'use client';

import { useRef, useState, useEffect } from 'react';
import styles from '../styles';
import { largeBarList } from '../constants';
import { MenuCard, TypingText } from '../components';

const LargeBarRoom = () => {
  const [active, setActive] = useState(largeBarList[1]?.id || null); // Set second image active by default
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
    const initialId = largeBarList[1]?.id;
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
      <TypingText
        title="| Large and XLarge Room"
        textStyles="text-center text-[20px] sm:text-[28px] font-semibold mb-10"
      />

      <div className={`${styles.innerWidth} mx-auto flex flex-col`}>
      <div
  ref={scrollContainerRef}
  className="flex gap-2 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide px-4"
>
  {largeBarList.map((item) => (
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

export default LargeBarRoom;
