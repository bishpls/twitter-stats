export function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

export function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

export function zScore(value, m, sd) {
  if (sd === 0) return 0;
  return (value - m) / sd;
}

export function percentileRank(value, sortedArr) {
  let count = 0;
  for (const v of sortedArr) {
    if (v < value) count++;
    else break;
  }
  return count / sortedArr.length;
}
