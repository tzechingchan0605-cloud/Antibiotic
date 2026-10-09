// Keep annotations separate so the original photograph remains unchanged.
export const HISTORY_PHOTO_URL = 'assets/alexander-fleming-petri-dish-penicillin.jpg';
export const historyCaptionKey = HISTORY_PHOTO_URL ? 'historyCaption' : 'historyIllustrationCaption';
export function historyFigureMarkup() {
  if (HISTORY_PHOTO_URL) {
    // Points are tied to the unchanged 352 × 347 photo at (44, 90).
    // Leader starts are measured again after translation, including glosses.
    const leaders = [['mouldLabel','M72 28H96L192 145'], ['clearAreaTerm','M295 28H337L265 165'], ['colonies','M75 459H99L185.4 402.2']];
    const paths = leaders.map(([label,d]) => `<path data-history-leader="${label}" d="${d}"/>`).join('');
    return `<svg viewBox="0 0 440 536" role="img" data-history-labels data-i18n-aria="historyPhotoAlt">
      <image href="${HISTORY_PHOTO_URL}" x="44" y="90" width="352" height="347" preserveAspectRatio="xMidYMid meet"/>
      <g fill="none" stroke-linejoin="round"><g stroke="#fff" stroke-width="2.8">${paths}</g><g class="history-label-lines" stroke="#15333b" stroke-width="1.2">${paths}</g></g>
      <g fill="#15333b" font-weight="700"><text x="12" y="30" font-size="18" data-i18n="mouldLabel"></text><text x="238" y="28" font-size="17" data-i18n="clearAreaTerm"></text><text x="18" y="465" font-size="17" data-i18n="colonies"></text></g>
      <g fill="#42635b" font-size="14"><text x="12" y="55" data-i18n="fungusRemark"></text><text x="214" y="52" data-i18n="clearAreaLine1"></text><text x="214" y="74" data-i18n="clearAreaLine2"></text><text x="18" y="493" data-i18n="colonyMeaningLine1"></text><text x="18" y="517" data-i18n="colonyMeaningLine2"></text></g>
    </svg>`;
  }
  return `<svg viewBox="0 0 520 370" role="img" data-i18n-aria="historyIllustrationAlt"><defs><radialGradient id="agarHistory"><stop stop-color="#faf3d7"/><stop offset="1" stop-color="#eadfbc"/></radialGradient></defs><ellipse cx="244" cy="181" rx="138" ry="129" fill="url(#agarHistory)" stroke="#b4c7b9" stroke-width="10"/><ellipse cx="244" cy="181" rx="126" ry="117" fill="none" stroke="#fff" stroke-width="3"/><circle cx="289" cy="174" r="52" fill="#faf4dc"/>${Array.from({length:45},(_,i)=>{const a=i*2.4,r=25+(i%8)*12,x=235+Math.cos(a)*r,y=179+Math.sin(a)*r;return Math.hypot(x-289,y-174)>57?`<circle cx="${x}" cy="${y}" r="${4+i%3}" fill="#cfb471" stroke="#b09a60"/>`:'';}).join('')}<path d="M278 153q15-17 29 1q20 2 14 18q5 22-19 21q-15 12-24-6q-18-6-10-21z" fill="#74a28a" stroke="#497d65" stroke-width="3"/><g fill="#42635b" font-size="14"><path d="M188.27 122.92H108V47H35M300 171H397V112H480M328 205H407V260H491M223 284H168V329H34" stroke="#7b9a88" fill="none"/><text x="35" y="35" data-i18n="colonies"></text><text x="382" y="99" font-size="12" data-i18n="mould"></text><text x="335" y="285" font-size="12"><tspan x="335" data-i18n="clearAreaLine1"></tspan><tspan x="335" dy="17" data-i18n="clearAreaLine2"></tspan></text><text x="35" y="349" data-i18n="agar"></text></g></svg>`;
}

export function layoutHistoryLabels(root = document) {
  for (const svg of root.querySelectorAll('svg[data-history-labels]')) {
    const label = key => svg.querySelector(`[data-i18n="${key}"]`);
    const rightEdge = element => {
      let width = element.getComputedTextLength();
      // The login screen hides the main SVG. Measure with the same font there.
      if (!width) {
        const context = document.createElement('canvas').getContext('2d');
        const style = getComputedStyle(element);
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        width = context.measureText(element.textContent).width;
      }
      return Number(element.getAttribute('x')) + width;
    };
    const clearEnglish = /[A-Za-z]/.test(label('clearAreaTerm').textContent);
    for (const key of ['clearAreaLine1','clearAreaLine2']) {
      label(key).setAttribute('x', clearEnglish ? '238' : '214');
    }
    for (const [key,y,targetX,targetY] of [
      ['mouldLabel',28,192,145], ['clearAreaTerm',28,265,165], ['colonies',459,185.4,402.2]
    ]) {
      const start = Math.ceil(rightEdge(label(key))) + 7;
      const elbow = Math.min(start + (key==='clearAreaTerm' ? 42 : 24), key==='mouldLabel' ? 224 : 426);
      const d = `M${start} ${y}H${elbow}L${targetX} ${targetY}`;
      for (const path of svg.querySelectorAll(`[data-history-leader="${key}"]`)) path.setAttribute('d',d);
    }
  }
}
