import React, { useState, useEffect } from "react";
import Scrollyteller from "@abcnews/scrollyteller";
import Dots from "../Dots";
import styles from "./styles.scss";

export default function App({ scrollyData, dataUrl }) {
  const [mark, setMark] = useState();
  return scrollyData ? (
    <Scrollyteller
      panels={scrollyData.panels}
      panelClassName={styles.base}
      onMarker={mark => setMark(mark)}
    >
      <Dots mark={mark} dataUrl={dataUrl} />
    </Scrollyteller>
  ) : null;
}
