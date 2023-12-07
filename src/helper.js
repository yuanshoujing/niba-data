export function padding(str, width, c = " ") {
  return str.length < width ? c.repeat(width - str.length) + str : str;
}
