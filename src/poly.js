// Polyfill for lower than ES2015
Math.hypot =
  Math.hypot ||
  function () {
    var y = 0;
    var length = arguments.length;

    for (var i = 0; i < length; i++) {
      if (arguments[i] === Infinity || arguments[i] === -Infinity) {
        return Infinity;
      }
      y += arguments[i] * arguments[i];
    }
    return Math.sqrt(y);
  };
