export function _(parentOrSelector, selector) {
  return selector
    ? parentOrSelector.querySelector(selector)
    : document.querySelector(parentOrSelector);
}

export function plural(count, object, suffix = "s") {
  return count + " " + object + (count === 1 ? "" : suffix);
}
