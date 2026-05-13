'use strict';

const display = document.getElementById('display');
const expression = document.getElementById('expression');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistory');
const historyToggle = document.getElementById('historyToggle');
const historyPanel = document.getElementById('historyPanel');
const themeToggle = document.getElementById('themeToggle');

// ── Theme ──

function applyTheme(isLight) {
  document.documentElement.classList.toggle('light', isLight);
  themeToggle.setAttribute('aria-label', isLight ? 'Mudar para tema escuro' : 'Mudar para tema claro');
}

(function initTheme() {
  const saved = localStorage.getItem('theme');
  const preferLight = saved
    ? saved === 'light'
    : window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(preferLight);
})();

themeToggle.addEventListener('click', () => {
  const isLight = !document.documentElement.classList.contains('light');
  applyTheme(isLight);
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
});

const state = {
  current: '0',
  previous: null,
  operator: null,
  waitingForOperand: false,
  expression: '',
  justEqualed: false,
};

const history = [];

function formatNumber(num) {
  const n = parseFloat(num);
  if (isNaN(n)) return num;
  if (!isFinite(n)) return 'Erro';
  const str = n.toPrecision(12).replace(/\.?0+$/, '');
  return parseFloat(str).toString();
}

function updateDisplay() {
  const val = state.current;
  display.textContent = val.length > 15 ? parseFloat(val).toExponential(6) : val;
  expression.textContent = state.expression;

  const len = display.textContent.length;
  display.className = 'display-value' + (len > 12 ? ' xsmall' : len > 9 ? ' small' : '');

  document.querySelectorAll('.btn-operator').forEach(btn => {
    btn.classList.toggle('active-operator',
      !state.waitingForOperand === false &&
      state.operator === btn.dataset.value &&
      state.waitingForOperand
    );
  });
}

function inputNumber(digit) {
  if (state.justEqualed) {
    state.current = digit;
    state.expression = '';
    state.justEqualed = false;
    updateDisplay();
    return;
  }

  if (state.waitingForOperand) {
    state.current = digit;
    state.waitingForOperand = false;
  } else {
    if (state.current === '0' && digit !== '.') {
      state.current = digit;
    } else if (state.current.length < 15) {
      state.current += digit;
    }
  }
  updateDisplay();
}

function inputDecimal() {
  if (state.justEqualed) {
    state.current = '0.';
    state.expression = '';
    state.justEqualed = false;
    updateDisplay();
    return;
  }

  if (state.waitingForOperand) {
    state.current = '0.';
    state.waitingForOperand = false;
    updateDisplay();
    return;
  }

  if (!state.current.includes('.')) {
    state.current += '.';
    updateDisplay();
  }
}

function calculate(a, op, b) {
  const x = parseFloat(a);
  const y = parseFloat(b);
  switch (op) {
    case '+': return x + y;
    case '−': return x - y;
    case '×': return x * y;
    case '÷': return y === 0 ? Infinity : x / y;
    default: return y;
  }
}

function inputOperator(op) {
  state.justEqualed = false;

  if (state.operator && !state.waitingForOperand) {
    const result = calculate(state.previous, state.operator, state.current);
    const formatted = formatNumber(result);
    state.expression = formatted + ' ' + op;
    state.previous = formatted;
    state.current = formatted;
  } else {
    state.previous = state.current;
    state.expression = state.current + ' ' + op;
  }

  state.operator = op;
  state.waitingForOperand = true;
  updateDisplay();
}

function inputEquals() {
  if (!state.operator || state.waitingForOperand) return;

  const a = state.previous;
  const b = state.current;
  const op = state.operator;
  const result = calculate(a, op, b);
  const formatted = formatNumber(result === Infinity ? 'Erro' : result);

  const expr = `${a} ${op} ${b}`;
  addHistory(expr, formatted);

  state.expression = `${expr} =`;
  state.current = formatted;
  state.previous = null;
  state.operator = null;
  state.waitingForOperand = false;
  state.justEqualed = true;

  updateDisplay();
}

function clearAll() {
  state.current = '0';
  state.previous = null;
  state.operator = null;
  state.waitingForOperand = false;
  state.expression = '';
  state.justEqualed = false;
  updateDisplay();
}

function toggleSign() {
  if (state.current !== '0') {
    state.current = state.current.startsWith('-')
      ? state.current.slice(1)
      : '-' + state.current;
    state.justEqualed = false;
    updateDisplay();
  }
}

function inputPercent() {
  const val = parseFloat(state.current);
  if (isNaN(val)) return;
  state.current = formatNumber(val / 100);
  state.justEqualed = false;
  updateDisplay();
}

// ── History ──

function addHistory(expr, result) {
  const now = new Date();
  const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  history.unshift({ expr, result, time });

  const empty = historyList.querySelector('.history-empty');
  if (empty) empty.remove();

  const item = document.createElement('div');
  item.className = 'history-item';
  item.innerHTML = `
    <div class="history-item-expression">${escapeHtml(expr)}</div>
    <div class="history-item-result">${escapeHtml(result)}</div>
    <div class="history-item-time">${time}</div>
  `;

  item.addEventListener('click', () => {
    state.current = result;
    state.operator = null;
    state.previous = null;
    state.waitingForOperand = false;
    state.expression = result;
    state.justEqualed = false;
    updateDisplay();

    if (window.innerWidth <= 680) closeHistory();
  });

  historyList.prepend(item);
}

function clearHistory() {
  history.length = 0;
  historyList.innerHTML = '<p class="history-empty">Nenhuma operação ainda.</p>';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Mobile history drawer ──

function openHistory() {
  historyPanel.classList.add('open');
}

function closeHistory() {
  historyPanel.classList.remove('open');
}

historyToggle.addEventListener('click', () => {
  historyPanel.classList.contains('open') ? closeHistory() : openHistory();
});

document.addEventListener('click', e => {
  if (
    window.innerWidth <= 680 &&
    historyPanel.classList.contains('open') &&
    !historyPanel.contains(e.target) &&
    e.target !== historyToggle
  ) {
    closeHistory();
  }
});

clearHistoryBtn.addEventListener('click', clearHistory);

// ── Button clicks ──

document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const { action, value } = btn.dataset;
    switch (action) {
      case 'number':   inputNumber(value); break;
      case 'operator': inputOperator(value); break;
      case 'decimal':  inputDecimal(); break;
      case 'equals':   inputEquals(); break;
      case 'clear':    clearAll(); break;
      case 'sign':     toggleSign(); break;
      case 'percent':  inputPercent(); break;
    }
  });
});

// ── Keyboard support ──

document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  const key = e.key;

  if (key >= '0' && key <= '9') { inputNumber(key); return; }
  if (key === '.') { inputDecimal(); return; }
  if (key === 'Enter' || key === '=') { e.preventDefault(); inputEquals(); return; }
  if (key === 'Escape' || key === 'c' || key === 'C') { clearAll(); return; }
  if (key === '+') { inputOperator('+'); return; }
  if (key === '-') { inputOperator('−'); return; }
  if (key === '*') { inputOperator('×'); return; }
  if (key === '/') { e.preventDefault(); inputOperator('÷'); return; }
  if (key === '%') { inputPercent(); return; }
  if (key === 'Backspace') {
    if (state.current.length > 1 && !state.waitingForOperand) {
      state.current = state.current.slice(0, -1);
      updateDisplay();
    } else {
      clearAll();
    }
  }
});

updateDisplay();
