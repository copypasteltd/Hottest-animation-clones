import {cmpText, utc} from './model.ts';
import type {HeatState, Platform, Query} from './model.ts';
export const DAY = 86_400_000;
export type HeatInput = {id: string; platform: Platform; samples: Array<{at: string; views: number | null;
  likes: number | null; comments: number | null; reposts: number | null}>};
export type Heat = {heat: number | null; heatAt: string | null; heatState: HeatState};
export function heatScores(asOf: string, works: HeatInput[]): Map<string, Heat> {
  const now = utc(asOf);
  if (now === null) throw new Error('invalid ranking snapshot time');
  const output = new Map<string, Heat>();
  const groups = new Map<string, Array<{id: string; at: string; raw: number}>>();
  for (const work of works) {
    if (output.has(work.id)) throw new Error('duplicate work in heat cohort');
    const times = work.samples.flatMap(sample => {
      const time = utc(sample.at);
      const values = [sample.views, sample.likes, sample.comments, sample.reposts];
      return time !== null && time <= now && sample.views !== null &&
        values.every(v => v === null || Number.isSafeInteger(v) && v >= 0) ? [{time, at: sample.at, values}] : [];
    }).sort((a,b) => b.time - a.time);
    const sample = times[0];
    output.set(work.id, {heat: null, heatAt: sample?.at ?? null,
      heatState: !sample ? 'missing' : now - sample.time > 30 * DAY ? 'stale' : 'incomparable'});
    if (!sample || now - sample.time > 30 * DAY) continue;
    const mask = sample.values.map(v => v === null ? '0' : '1').join('');
    const key = work.platform + '/' + mask;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({id: work.id, at: sample.at,
      raw: Math.log1p(sample.values.reduce<number>((sum, v, i) => sum + (v ?? 0) * [1,4,6,8][i], 0))});
  }
  for (const group of groups.values()) {
    const size = group.length;
    if (size < 2) continue;
    group.sort((a,b) => a.raw - b.raw || cmpText(a.id,b.id));
    for (let first = 0; first < size;) {
      let next = first + 1;
      while (next < size && group[first].raw === group[next].raw) next++;
      const percentile = (first + next - 1) / (2 * (size - 1));
      const heat = 0.5 + size / (size + 8) * (percentile - 0.5);
      for (let j = first; j < next; j++) output.set(group[j].id, {heat, heatAt: group[j].at, heatState: 'available'});
      first = next;
    }
  }
  return output;
}
export function listedTime(asOfMs: number, listedAt: string | null) {
  const t = utc(listedAt);
  return t !== null && t <= asOfMs ? t : null;
}
export function trendScore(asOfMs: number, listedAt: string | null, heat: number | null) {
  const time = listedTime(asOfMs, listedAt);
  return .55 * (time === null ? 0 : 2 ** (-(asOfMs - time) / (14 * DAY))) + .45 * (heat ?? .5);
}
const quantize = (n: number) => Math.round(n * 1e6);
export type RankItem = {id: string; listedAt: string | null; heat: number | null; relevance: number; exactId: boolean};
export function rankOrder(a: RankItem, b: RankItem, sort: Query['sort'], now: number, hasWords: boolean) {
  const time = (b: RankItem) => listedTime(now,b.listedAt) ?? -Infinity;
  const trend = (r: RankItem) => quantize(hasWords ? .75 * r.relevance + .25 * trendScore(now,r.listedAt,r.heat) : trendScore(now,r.listedAt,r.heat));
  const hot = (r: RankItem) => r.heat === null ? -Infinity : quantize(r.heat);
  const first = sort === 'trend' ? Number(b.exactId) - Number(a.exactId) || trend(b) - trend(a)
    : sort === 'hot' ? hot(b) - hot(a) : 0;
  return first || time(b) - time(a) || cmpText(a.id,b.id);
}
