#!/usr/bin/env node
// Translate CJK placeholder strings in PPTist mock template JSONs to English.
// Run: node scripts/translate-pptist-templates.mjs
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..', 'src/pptist/public/mocks');

// Longest-first to avoid substring collisions (e.g. "目录项" matched before "目录").
const map = [
  ['模板小节过渡正文', 'Section Transition Body'],
  ['模板小节过渡标题', 'Section Transition Title'],
  ['模板内容页标题', 'Content Page Title'],
  ['模板封面正文', 'Template Cover Body'],
  ['模板封面标题', 'Template Cover Title'],
  ['模板过渡标题', 'Transition Title'],
  ['过渡页副标题', 'Transition Subtitle'],
  ['过渡页主标题', 'Transition Main Title'],
  ['过渡页标题', 'Transition Title'],
  ['过渡页正文', 'Transition Body'],
  ['封面页主标题', 'Cover Main Title'],
  ['封面页副标题', 'Cover Subtitle'],
  ['封面页标题', 'Cover Title'],
  ['内容页标题', 'Content Page Title'],
  ['内容项标题', 'Content Item Title'],
  ['内容项正文', 'Content Item Body'],
  ['在此输入标题', 'Enter title here'],
  ['未命名演示文稿', 'Untitled Presentation'],
  ['感谢您的观看', 'Thank You'],
  ['谢谢聆听 THANKS', 'THANK YOU'],
  ['谢谢聆听', 'Thank You'],
  ['感谢聆听', 'Thank You'],
  ['感谢倾听', 'Thank You'],
  ['感谢观看', 'Thank You'],
  ['欢迎观看', 'Welcome'],
  ['演讲人：XXX', 'Presenter: XXX'],
  ['演讲人：xxx', 'Presenter: xxx'],
  ['汇报人：xxx', 'Presenter: xxx'],
  ['日期：XXX', 'Date: XXX'],
  ['时间：XXX', 'Time: XXX'],
  ['商务汇报', 'Business Report'],
  ['工作总结', 'Work Summary'],
  ['工作计划', 'Work Plan'],
  ['目录项一', 'Item 1'],
  ['目录项二', 'Item 2'],
  ['目录项三', 'Item 3'],
  ['目录项四', 'Item 4'],
  ['目录项五', 'Item 5'],
  ['目录项六', 'Item 6'],
  ['目录项七', 'Item 7'],
  ['目录项八', 'Item 8'],
  ['目录项九', 'Item 9'],
  ['目录项十', 'Item 10'],
  ['目录项10', 'Item 10'],
  ['目录项1', 'Item 1'],
  ['目录项2', 'Item 2'],
  ['目录项3', 'Item 3'],
  ['目录项4', 'Item 4'],
  ['目录项5', 'Item 5'],
  ['目录项6', 'Item 6'],
  ['目录项7', 'Item 7'],
  ['目录项8', 'Item 8'],
  ['目录项9', 'Item 9'],
  ['目录项', 'Item'],
  ['项目10', 'Item 10'],
  ['项目1', 'Item 1'],
  ['项目2', 'Item 2'],
  ['项目3', 'Item 3'],
  ['项目4', 'Item 4'],
  ['项目5', 'Item 5'],
  ['项目6', 'Item 6'],
  ['项目7', 'Item 7'],
  ['项目8', 'Item 8'],
  ['项目9', 'Item 9'],
  ['项目', 'Item'],
  ['目录', 'Contents'],
  ['感谢', 'Thanks'],
  ['观看', 'watching'],
  ['你的', 'your'],
  ['一', '1'],
  ['六', '6'],
  // Post-pass: cleanup leftovers from partial matches
  ['模板封面', 'Template Cover'],
  ['内容项', 'Content Item'],
  ['模板', 'Template'],
  ['页副标题', ' Subtitle'],
  ['目', 'Con'],
  ['录', 'tents'],
];

function translate(s) {
  for (const [zh, en] of map) {
    s = s.split(zh).join(en);
  }
  return s;
}

const files = fs.readdirSync(root).filter(f => /^template_\d+\.json$/.test(f));
let totalReplaced = 0;
for (const f of files) {
  const p = path.join(root, f);
  const before = fs.readFileSync(p, 'utf8');
  const after = translate(before);
  if (before !== after) {
    fs.writeFileSync(p, after, 'utf8');
    totalReplaced++;
    console.log(`translated ${f}`);
  }
}
console.log(`done. files changed: ${totalReplaced}`);
