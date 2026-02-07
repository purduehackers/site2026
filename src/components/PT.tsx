import { useEffect, useState } from 'react';
import PixelTrail from './PixelTrail';

export default function PT(props) {
  const [color, setColor] = useState('#000000');

  useEffect(() => {
    const darkSection = document.querySelector('[data-header-dark]');
    if (!darkSection) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setColor('#FFEE00');
          } else {
            setColor('#000000');
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(darkSection);
    
    return () => observer.disconnect();
  }, []);

  return <PixelTrail {...props} color={color} />;
}