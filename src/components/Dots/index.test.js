import React from 'react';
import renderer from 'react-test-renderer';

import Dots from '.';

describe('Dots', () => {
  test('It renders', () => {
    const component = renderer.create(<Dots />);

    let tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });
});
