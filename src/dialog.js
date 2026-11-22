// Small boxes over the game for what the canvas cannot do well (F-040): typing a name or a room code, which on an
// iPad needs the system's own keyboard, and the invitation to a room with its link and QR code. Like the fullscreen
// button, everything that happens in a box stays there, so that the game does not steer or shoot meanwhile, and the
// game's screen gets the keys back when the box closes.
const STYLE = `
  .crit-dialog { position: fixed; inset: 0; z-index: 2147483646; display: flex; align-items: center; justify-content: center;
    background: rgba(5, 5, 10, 0.72); font: 16px/1.4 ui-monospace, Menlo, Consolas, monospace; color: #e3e5ec; }
  .crit-dialog .box { background: #0f0f1a; border: 1px solid #2a2c3a; border-radius: 8px; padding: 18px 20px; width: min(92vw, 460px);
    display: flex; flex-direction: column; gap: 12px; text-align: center; }
  .crit-dialog h2 { margin: 0; font-size: 18px; letter-spacing: 0.08em; }
  .crit-dialog p { margin: 0; color: #9aa0b4; font-size: 14px; }
  .crit-dialog input { font: inherit; font-size: 22px; text-align: center; text-transform: uppercase; padding: 8px; color: #e3e5ec;
    background: #14141c; border: 1px solid #dba445; border-radius: 6px; letter-spacing: 0.12em; }
  .crit-dialog .row { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
  .crit-dialog button { font: inherit; min-height: 44px; padding: 0 16px; color: #e3e5ec; background: #1c2140; border: 1px solid #4fb0c8;
    border-radius: 6px; cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .crit-dialog button:active { background: #2c3a7a; }
  .crit-dialog button.quiet { border-color: #2a2c3a; background: #14141c; }
  .crit-dialog .code { font-size: 34px; letter-spacing: 0.3em; color: #dba445; }
  .crit-dialog .link { font-size: 13px; color: #9be4ee; word-break: break-all; user-select: all; -webkit-user-select: all; }
  .crit-dialog .qr { width: 180px; height: 180px; margin: 0 auto; background: #fff; padding: 6px; border-radius: 4px; }
  .crit-dialog .qr svg { width: 100%; height: 100%; display: block; }
  .crit-dialog .box { max-height: 94vh; overflow-y: auto; }
  /* A phone on its side: less room, everything smaller, so that the whole box fits (2026-11-22). */
  @media (max-height: 520px) {
    .crit-dialog .box { padding: 10px 14px; gap: 6px; }
    .crit-dialog h2 { font-size: 15px; }
    .crit-dialog p { font-size: 12px; }
    .crit-dialog .code { font-size: 24px; }
    .crit-dialog .qr { width: min(180px, 34vh); height: min(180px, 34vh); padding: 4px; }
    .crit-dialog button { min-height: 36px; }
  }`;

let styled = false;
function open(build) {
  if (!styled) {
    const s = document.createElement('style');
    s.textContent = STYLE;
    document.head.appendChild(s);
    styled = true;
  }
  const back = document.createElement('div');
  back.className = 'crit-dialog';
  const box = document.createElement('div');
  box.className = 'box';
  back.appendChild(box);
  for (const type of [
    'pointerdown',
    'pointerup',
    'mousedown',
    'mouseup',
    'touchstart',
    'touchend',
    'keydown',
    'keyup',
    'wheel',
  ])
    back.addEventListener(type, (e) => e.stopPropagation());
  document.documentElement.appendChild(back);
  const close = () => {
    back.remove();
    const canvas = /** @type {HTMLElement | null} */ (document.querySelector('canvas[tabindex]'));
    if (canvas) canvas.focus();
  };
  build(box, close);
  return close;
}
const el = (tag, text, cls) => {
  const e = document.createElement(tag);
  if (text) e.textContent = text;
  if (cls) e.className = cls;
  return e;
};

// Asks for a short text. Resolves to the text, in capitals, or null when it is cancelled.
export function ask(title, about, { value = '', max = 16, pattern = null } = {}) {
  return new Promise((resolve) => {
    open((box, close) => {
      box.append(el('h2', title), el('p', about));
      const input = /** @type {HTMLInputElement} */ (el('input'));
      input.value = value;
      input.maxLength = max;
      input.autocapitalize = 'characters';
      input.spellcheck = false;
      const row = el('div', '', 'row');
      const ok = el('button', 'OK');
      const cancel = el('button', 'CANCEL', 'quiet');
      row.append(ok, cancel);
      box.append(input, row);
      const done = (v) => {
        close();
        resolve(v);
      };
      const submit = () => {
        const v = input.value.trim().toUpperCase();
        if (!v || (pattern && !pattern.test(v))) {
          input.focus();
          return;
        }
        done(v);
      };
      ok.addEventListener('click', submit);
      cancel.addEventListener('click', () => done(null));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
        if (e.key === 'Escape') done(null);
      });
      setTimeout(() => input.focus(), 0);
    });
  });
}

// The invitation to a room: the code to read out, the link to send and a QR code to scan.
export function invite(code, link, qrSvg) {
  open((box, close) => {
    box.append(
      el('h2', 'INVITE TO THE ROOM'),
      el('p', 'TELL THE OTHERS THE CODE, SEND THEM THE LINK, OR LET THEM SCAN'),
    );
    box.append(el('div', code.split('').join(''), 'code'));
    const qr = el('div', '', 'qr');
    qr.innerHTML = qrSvg;
    box.append(qr, el('div', link, 'link'));
    const row = el('div', '', 'row');
    const copy = el('button', 'COPY THE LINK');
    const shut = el('button', 'CLOSE', 'quiet');
    row.append(copy, shut);
    box.append(row);
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(link);
        copy.textContent = 'COPIED';
      } catch {
        copy.textContent = 'SELECT THE LINK AND COPY IT';
      }
    });
    shut.addEventListener('click', close);
  });
}

// A short message that waits for OK.
export function tell(title, text) {
  open((box, close) => {
    const ok = el('button', 'OK');
    box.append(el('h2', title), el('p', text), ok);
    ok.addEventListener('click', close);
  });
}
