export const plural = (n: number, forms: [string, string, string]) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return forms[0];
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return forms[1];
  }
  return forms[2];
};
export const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; //с двоеточием (02:01)

export const formatDuration = (total: number) => {
  //словарь "минут, секунд" (2 минуты 1 секунда)
  const m = Math.floor(total / 60);
  const s = total % 60;
  const min = `${m} ${plural(m, ['минута', 'минуты', 'минут'])}`;
  const sec = `${s} ${plural(s, ['секунда', 'секунды', 'секунд'])}`;
  return m > 0 ? `${min} ${sec}` : sec;
};

export const readSeconds = (state: unknown): number | null => {
  if (typeof state !== 'object' || (state === null && state !== 0) || !('seconds' in state)) {
    return null;
  }
  const { seconds } = state;
  return typeof seconds === 'number' && seconds >= 0 ? seconds : null;
};
