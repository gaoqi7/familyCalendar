import { useEffect, useRef } from "react";

const isPageVisible = () =>
  typeof document === "undefined" || document.visibilityState !== "hidden";

const usePoll = (callback, delayMs) => {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const tick = async () => {
      if (!isPageVisible()) {
        return;
      }
      try {
        await savedCallback.current();
      } catch (error) {
        console.error(error);
      }
    };

    tick();
    if (!delayMs) {
      return undefined;
    }
    const id = setInterval(tick, delayMs);
    return () => clearInterval(id);
  }, [delayMs]);
};

export default usePoll;
