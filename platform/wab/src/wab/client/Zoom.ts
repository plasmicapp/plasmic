export function zoomJump(current: number, dir: 1 | -1) {
  const powerRounded = Math.round(Math.log2(current));
  const nextPower = powerRounded + dir;
  return 2 ** nextPower;
}
