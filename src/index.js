import acto from '@abcnews/alternating-case-to-object';
import { decode } from '@abcnews/base-36-props';
import { getMountValue, isMount, selectMounts } from '@abcnews/mount-utils';
import { loadScrollyteller } from '@abcnews/scrollyteller';
import React from 'react';
import { render } from 'react-dom';
import App from './components/App';

const SCROLLYTELLER_NAME = 'groupyteller';
const SCROLLYTELLER_MOUNT_PREFIX = `scrollytellerNAME${SCROLLYTELLER_NAME}`;
const ENCODED_PROPS_ERROR =
  'No encoded config found. Expected a base36-encoded CONFIG object on the opening scrollyteller marker with `dataURL` and `total` values';
const DEFAULT_APP_PROPS = {
  dataURL: `${__webpack_public_path__}data.csv`,
  total: 100
};

let appProps;

function renderApp() {
  render(<App {...appProps} />, appProps.scrollyData.mountNode);
}

function init() {
  try {
    // Isolate and decode CONFIG from opening scrollyteller tag (which may contain `dataURL` and `total`)
    const [decodedAppProps] = selectMounts(SCROLLYTELLER_MOUNT_PREFIX, { markAsUsed: false }).map(el => {
      const mountProps = acto(getMountValue(el));

      if (!mountProps.config) {
        throw new Error(ENCODED_PROPS_ERROR);
      }

      const decodedProps = decode(mountProps.config);

      if (!decodedProps) {
        throw new Error(ENCODED_PROPS_ERROR);
      }

      el.setAttribute('id', el.getAttribute('id').replace(/CONFIG[a-z0-9]+/, ''));

      return decodedProps;
    });

    // Get scrollteller config, including `align` as a data prop
    const scrollyData = loadScrollyteller('groupyteller', 'u-full');

    scrollyData.panels.forEach(panel => {
      panel.data.align = panel.align;
    });

    // Keep the DOM tidy.
    if (scrollyData && scrollyData.mountNode) {
      while (isMount(scrollyData.mountNode.nextElementSibling)) {
        scrollyData.mountNode.parentElement.removeChild(scrollyData.mountNode.nextElementSibling);
      }
    }

    // Set <App /> props for initial and subsequent renders
    appProps = {
      ...DEFAULT_APP_PROPS,
      ...decodedAppProps,
      scrollyData
    };
  } catch (e) {
    console.error(e);
  }

  // Initial render
  renderApp();

  // [async: after initial render] Add data-* attriubutes to aligned panels so we can override some styles
  setTimeout(() => {
    appProps.scrollyData.panels.forEach(panel => {
      if (!panel.align || !panel.nodes.length || !panel.nodes[0].parentElement) {
        return;
      }

      panel.nodes[0].parentElement.setAttribute('data-align', panel.align);
    });
  }, 300);
}

if (window.__ODYSSEY__) {
  init();
} else {
  window.addEventListener('odyssey:api', init);
}

if (module.hot) {
  module.hot.accept('./components/App', () => {
    try {
      renderApp();
    } catch (err) {
      import('./components/ErrorBox').then(exports => {
        const ErrorBox = exports.default;
        render(<ErrorBox error={err} />, root);
      });
    }
  });
}

if (process.env.NODE_ENV === 'development') {
  console.debug(`[Public path: ${__webpack_public_path__}`);
}
