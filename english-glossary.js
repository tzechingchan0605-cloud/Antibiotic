// Vocabulary support for authored English text. Never apply to learner answers.
const entries = [
  ['methicillin-resistant\\s+Staphylococcus\\s+aureus(?:\\s*\\(MRSA\\))?', '耐甲氧西林金黃葡萄球菌'],
  ['antibiotic\\s+resistance', '抗生素抗性／抗藥性'],
  ['resistance\\s+traits?', '抗藥性特徵'],
  ['bacterial\\s+colon(?:y|ies)', '細菌菌落'],
  ['selection\\s+pressure', '選擇壓力'],
  ['clear[ -]zones?', '清晰區'],
  ['Staphylococcus\\s+aureus', '金黃葡萄球菌'],
  ['MRSA', '耐甲氧西林金黃葡萄球菌'],
  ['methicillin', '甲氧西林'],
  ['Penicillium', '青黴菌'],
  ['penicillin', '青黴素'],
  ['antibiotics?', '抗生素'],
  ['inhibition|inhibit(?:s|ed|ing)?|inhibitory', '抑制'],
  ['susceptibility', '對抗生素的敏感性'],
  ['susceptible', '對抗生素敏感的'],
  ['resistance', '抗藥性'],
  ['resistant', '具抗藥性的'],
  ['reproduction|reproduce(?:s|d)?|reproducing', '繁殖'],
  ['inheritance|inherit(?:s|ed|ing)?', '遺傳'],
  ['overuse', '過度使用'],
  ['misuse', '不當使用'],
  ['colon(?:y|ies)', '菌落'],
  ['contamination', '污染'],
  ['forceps', '鑷子'],
  ['invert(?:s|ed|ing)?', '倒置'],
  ['nutrients?', '營養物質'],
  ['diameters?', '直徑'],
  ['accuracy', '準確度'],
  ['reproducibility', '可重複性'],
  ['reliability', '可靠性'],
  ['consistency', '一致性'],
  ['consistent', '一致的']
];
const pattern = new RegExp(`\\b(?:${entries.map(([term]) => term).join('|')})(?![A-Za-z0-9_])`, 'gi');
const meanings = entries.map(([term, meaning]) => [new RegExp(`^(?:${term})$`, 'i'), meaning]);

export function glossEnglish(value) {
  return String(value ?? '').replace(pattern, (word, offset, source) => {
    // Idempotent when a translated label is reused by a report or diagram.
    if (/^（[^）]*[\u3400-\u9fff][^）]*）/.test(source.slice(offset + word.length))) return word;
    const meaning = meanings.find(([term]) => term.test(word))[1];
    return `${word}（${meaning}）`;
  });
}

// Fit long bilingual labels inside the existing learning-diagram columns.
export function fitEnglishDiagramLabels(markup) {
  return markup.replace(/<text([^>]*)>([^<]*)([\s\S]*?)<\/text>/g, (whole, attrs, first, rest) => {
    const x = Number(/\bx="([\d.]+)"/.exec(attrs)?.[1]);
    if (!x || x < 220) return whole;
    const width = 460 - x - 12;
    const estimate = [...first].reduce((sum, char) => sum + (/[\u3400-\u9fff（）]/.test(char) ? 16 : 8), 0);
    if (estimate <= width) return whole;
    return `<text${attrs}><tspan textLength="${width}" lengthAdjust="spacingAndGlyphs">${first}</tspan>${rest}</text>`;
  });
}
