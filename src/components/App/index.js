import React, { useState, useEffect } from "react";
import Scrollyteller from "@abcnews/scrollyteller";
import Dots from "../Dots";
import styles from "./styles.scss";

export default function App({ scrollyData, dataUrl, total }) {
  const [mark, setMark] = useState();
  const [dimensions, setDimensions] = useState();

  useEffect(() => {
    const updateDimensions = context => {
      if (!dimensions || context.hasChanged) {
        setDimensions([context.width, context.height]);
      }
    };

    window.__ODYSSEY__.scheduler.subscribe(updateDimensions);
    return () => window.__ODYSSEY__.scheduler.unsubscribe(updateDimensions);
  }, [dimensions]);

  return scrollyData && dimensions ? (
    <Scrollyteller
      panels={scrollyData.panels}
      panelClassName={styles.base}
      onMarker={mark => setMark(mark)}
    >
      <Dots
        mark={mark}
        marks={scrollyData.panels.map(d => d.config)}
        dataUrl={dataUrl}
        total={total}
        width={dimensions[0]}
        height={dimensions[1]}
      />
    </Scrollyteller>
  ) : null;
}
