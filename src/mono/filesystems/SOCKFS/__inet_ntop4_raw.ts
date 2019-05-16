export const __inet_ntop4_raw = (addr: number) => (
  `${addr & 255}.${addr >> 8 & 255}.${addr >> 16 & 255}.${addr >> 24 & 255}`
);
