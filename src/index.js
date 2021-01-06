import { isMount } from "@abcnews/mount-utils";
import { loadScrollyteller } from "@abcnews/scrollyteller";
import React from "react";
import { render } from "react-dom";
import App from "./components/App";

const PROJECT_NAME = "groupyteller";
const root = document.querySelector(`[data-${PROJECT_NAME}-root]`);

let scrollyData;

function init() {
  try {
    scrollyData = loadScrollyteller("groupyteller", "u-full");
    scrollyData.panels.forEach(panel => {
      panel.data.align = panel.align;
    });
  } catch (e) {
    console.error(e);
  }

  // Keep the DOM tidy.
  if (scrollyData && scrollyData.mountNode) {
    while (isMount(scrollyData.mountNode.nextElementSibling)) {
      scrollyData.mountNode.parentElement.removeChild(scrollyData.mountNode.nextElementSibling);
    }
  }

  render(
    <App
      projectName={PROJECT_NAME}
      scrollyData={scrollyData}
      dataUrl={root.dataset.data || `${__webpack_public_path__}data.csv`}
      total={+root.dataset.total}
    />,
    scrollyData.mountNode
  );

  // Add data-* attriubutes to aligned panels so we can override some styles
  setTimeout(() => {
    scrollyData.panels.forEach(panel => {
      if (
        !panel.align ||
        !panel.nodes.length ||
        !panel.nodes[0].parentElement
      ) {
        return;
      }

      panel.nodes[0].parentElement.setAttribute(
        "data-align",
        panel.align
      );
    });
  }, 300);
}

if (window.__ODYSSEY__) {
  init();
} else {
  window.addEventListener("odyssey:api", init);
}

if (module.hot) {
  module.hot.accept("./components/App", () => {
    try {
      init();
    } catch (err) {
      import("./components/ErrorBox").then(exports => {
        const ErrorBox = exports.default;
        render(<ErrorBox error={err} />, root);
      });
    }
  });
}

if (process.env.NODE_ENV === "development") {
  console.debug(`[${PROJECT_NAME}] public path: ${__webpack_public_path__}`);
}
