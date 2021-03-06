import React, { useState, useEffect } from 'react';
import Scrollyteller from '@abcnews/scrollyteller';
import Dots from '../Dots';
import scrollytellerPanelStyles from '@abcnews/scrollyteller/src/Panel/index.module.scss';
import styles from './styles.scss';

export default function App({ scrollyData, dataURL, total }) {
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
      panelClassName={`${scrollytellerPanelStyles.base} ${styles.panel}`}
      onMarker={mark => setMark(mark)}
    >
      <Dots
        mark={mark}
        marks={scrollyData.panels.map(d => d.data)}
        dataURL={dataURL}
        total={total}
        width={dimensions[0]}
        height={dimensions[1]}
      />
    </Scrollyteller>
  ) : null;
}
