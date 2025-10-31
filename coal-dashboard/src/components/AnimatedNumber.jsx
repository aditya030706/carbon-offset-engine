import { useMotionValue, animate } from "framer-motion";
import { useEffect, useState } from "react";

function AnimatedNumber({ value, duration = 1.2 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration,
      onUpdate(val) {
        setDisplay(Math.floor(val));
      }
    });
    return () => controls.stop();
  }, [value, duration]);

  return <span>{display.toLocaleString()}</span>;
}

export default AnimatedNumber;
