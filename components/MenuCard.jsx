'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';

const MenuCard = ({
  id,
  imgUrl,
  active,
  handleClick,
  scrollContainerRef,
}) => {
  const isActive = active === id;
  const cardRef = useRef(null);

  useEffect(() => {
    if (
      isActive
      && cardRef.current
      && scrollContainerRef?.current
      && window.innerWidth < 640
    ) {
      const card = cardRef.current;
      const container = scrollContainerRef.current;

      const cardRect = card.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const scrollLeft = card.offsetLeft - (containerRect.width / 2 - cardRect.width / 2);

      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth',
      });
    }
  }, [isActive]);

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={() => handleClick(id)}
      className={`relative flex-shrink-0 snap-center cursor-pointer transition-all duration-500 ease-out h-[400px] rounded-[36px] overflow-hidden ${
        isActive ? 'basis-[75vw] sm:basis-[500px]' : 'basis-[200px]'
      }`}
    >
      <Image
        src={imgUrl}
        alt=""
        fill
        className="object-cover rounded-[36px]"
        sizes="(max-width: 768px) 75vw, 500px"
        priority
      />
    </div>
  );
};

export default MenuCard;
