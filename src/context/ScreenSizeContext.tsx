import { createContext, useContext, useEffect, useState } from 'react';

import { SCREEN_SIZE } from '@/utils/constants';

interface ScreenSizeValueType {
  size: SCREEN_SIZE;
  isDesktop: boolean;
  isMobile: boolean;
}

const DEFAULT_VALUE = {
  size: SCREEN_SIZE.XL,
  isDesktop: true,
  isMobile: false,
};

const ScreenSizeContext = createContext<ScreenSizeValueType>(DEFAULT_VALUE);

const getScreenData = (screenWidth: number): ScreenSizeValueType => {
  if (screenWidth <= 576) {
    return { size: SCREEN_SIZE.SM, isDesktop: false, isMobile: true };
  }
  if (screenWidth <= 768) {
    return { size: SCREEN_SIZE.MD, isDesktop: false, isMobile: true };
  }
  if (screenWidth <= 992) {
    return { size: SCREEN_SIZE.LG, isDesktop: true, isMobile: false };
  }
  return { size: SCREEN_SIZE.XL, isDesktop: true, isMobile: false };
};

export const useScreenSize = () => useContext(ScreenSizeContext);

export const ScreenSizeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [screenData, setScreenData] = useState<ScreenSizeValueType>(
    typeof window === 'undefined' ? DEFAULT_VALUE : getScreenData(window?.innerWidth)
  );

  useEffect(() => {
    const handleResize = () => {
      setScreenData(getScreenData(window.innerWidth));
    };

    window?.addEventListener('resize', handleResize);
    return () => window?.removeEventListener('resize', handleResize);
  }, []);

  return <ScreenSizeContext.Provider value={screenData}>{children}</ScreenSizeContext.Provider>;
};
