// Rule check for the presentation (no dependencies; Node 18+).
// Hard rules only — everything else is left to the reviewer and the team:
//   1. key colours (:root palette tokens) are unchanged
//   2. every body slide has a headline <h2>
//   3. inline scripts still compile (a syntax error would freeze the whole deck)
// Prints a Markdown report; exits 1 when a hard rule fails.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const FILE = process.argv[2] || 'index.html';
const html = readFileSync(FILE, 'utf8');

const PALETTE = {
  '--l-blue': '#3b5bdb',
  '--l-pink': '#e64980',
  '--l-orange': '#ff6a3d',
  '--l-grad': 'linear-gradient(90deg, #4c6ef5 0%, #e64980 58%, #ff6a3d 100%)',
  '--l-cream': '#f6f1ec',
  '--l-ink': '#111114',
};

const fails = [];
const passes = [];
const norm = s => s.replace(/\s+/g, ' ').trim().toLowerCase();

// 1. palette tokens
for (const [name, want] of Object.entries(PALETTE)) {
  const m = html.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  if (!m) fails.push(`키 컬러 \`${name}\` 정의가 사라졌어요 (원래 값: \`${want}\`).`);
  else if (norm(m[1]) !== norm(want)) fails.push(`키 컬러 \`${name}\` 값이 바뀌었어요: \`${m[1].trim()}\` → 원래 값 \`${want}\`로 되돌려 주세요.`);
}
if (!fails.some(f => f.startsWith('키 컬러'))) passes.push('키 컬러 6개가 그대로예요.');

// 2. body slides need a headline
const body = html.slice(Math.max(0, html.search(/<body\b/i)));   // skip <style> (its comments mention <section>)
const slides = [...body.matchAll(/<section\s+class="slide\b[^"]*"[\s\S]*?<\/section>/g)].map(m => m[0]);
if (!slides.length) fails.push('본문 슬라이드(`<section class="slide …">`)를 찾지 못했어요.');
slides.forEach((s, i) => {
  const n = (s.match(/<h2\b/g) || []).length;
  const label = (s.match(/class="kicker[^"]*">([^<]+)</) || [])[1] || (s.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) || [])[1]?.replace(/<[^>]+>/g, '').slice(0, 24) || '';
  if (n === 0) fails.push(`${i + 1}번째 슬라이드${label ? ` (${label.trim()})` : ''}에 헤드라인 \`<h2>\`가 없어요.`);
});
if (slides.length && !fails.some(f => f.includes('헤드라인'))) passes.push(`본문 슬라이드 ${slides.length}장 모두 헤드라인이 있어요.`);

// 3. inline scripts compile
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
let scriptOk = true;
scripts.forEach((code, i) => {
  try { new vm.Script(code, { filename: `inline-script-${i + 1}.js` }); }
  catch (e) { scriptOk = false; fails.push(`스크립트 ${i + 1}에 문법 오류가 있어요: \`${e.message}\``); }
});
if (scriptOk) passes.push(`스크립트 ${scripts.length}개 모두 문법이 정상이에요.`);

const out = [
  `### 자동 규칙 검사: ${fails.length ? '❌ 수정 필요' : '✅ 통과'}`,
  '',
  ...fails.map(f => `- ❌ ${f}`),
  ...passes.map(p => `- ✅ ${p}`),
  '',
  '_규칙: CONTRIBUTING.md 참고 (키 컬러 유지 · 헤드라인 유지). 그 밖의 구성은 자유입니다._',
].join('\n');
console.log(out);
process.exit(fails.length ? 1 : 0);
