import React, { useEffect, useState } from 'react';
import PixelTrail from './PixelTrail';
import { getCollageDarkAnchor } from '../utils/collageAnchor';

export default function PT(props) {
  const [color, setColor] = useState('#000000');

  useEffect(() => {
    function update() {
      const darkEl = getCollageDarkAnchor();
      if (!darkEl) {
        setColor('#000000');
        return;
      }
      const rect = darkEl.getBoundingClientRect();
      setColor(rect.top <= window.innerHeight * 0.5 ? '#FFEE00' : '#000000');
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();

    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return <PixelTrail {...props} color={color} />;
}
