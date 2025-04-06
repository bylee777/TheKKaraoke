'use client';

import { useEffect, useRef } from 'react';
import styles from '../styles';

const ExploreCard = ({ id, imgUrl, title, text, index, active, handleClick, scrollContainerRef }) => {
  const isActive = active === id;
  const cardRef = useRef(null);

  useEffect(() => {
    if (isActive && cardRef.current && scrollContainerRef?.current && window.innerWidth < 640) {
      const card = cardRef.current;
      const container = scrollContainerRef.current;

      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const containerCenter = container.offsetWidth / 2;

      container.scrollTo({
        left: cardCenter - containerCenter,
        behavior: 'smooth',
      });
    }
  }, [isActive, scrollContainerRef]);

  return (
    <div
      ref={cardRef}
      className={`
        relative
        ${isActive ? 'w-[75vw] lg:w-[600px]' : 'w-[200px]'}
        h-[600px]
        transition-all duration-500 ease-out
        cursor-pointer snap-center
        flex-shrink-0 flex items-center justify-center
      `}
      onClick={() => handleClick(id)}
    >
      <img
        src={imgUrl}
        alt={title}
        className="absolute w-full h-full object-cover rounded-[24px]"
      />

      {!isActive && (
        <h3 className="
          font-semibold sm:text-[22px] text-[16px] text-white
          absolute z-0 lg:bottom-20 lg:rotate-[-90deg] lg:origin-[0,0]
          whitespace-normal break-words text-center w-[160px]
        ">
          {title}
        </h3>
      )}

      {isActive && (
        <div className="absolute bottom-0 p-8 flex justify-start w-full flex-col bg-[rgba(0,0,0,0.5)] rounded-b-[24px]">
          <div className={`${styles.flexCenter} w-[40px] h-[40px] rounded-[28px] glassmorphism mb-[5px]`}>
            <img
              src="/pig.png"
              alt="pig icon"
              className="w-1/2 h-1/2 object-contain"
            />
          </div>
          <h2 className="mt-[24px] font-semibold sm:text-[32px] text-[24px] text-white leading-tight break-words">
            {title}
          </h2>
          <p className="font-normal text-[16px] leading-[20.16px] text-white">
            {text}
          </p>
        </div>
      )}
    </div>
  );
};

export default ExploreCard;
