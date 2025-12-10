'use strict';

const STORAGE_KEY = 'personal-finance-dashboard-v1';

const defaultState = {
  income: [],
  expenses: [],
  assets: [],
  liabilities: [],
  emergency: { target: 0, saved: 0 },
  goals: [],
  investments: {
    SIP: { invested: 0, current: 0 },
    Stocks: { invested: 0, current: 0 },
    Gold: { invested: 0, current: 0 },
    'FD/RD': { invested: 0, current: 0 },
    Crypto: { invested: 0, current: 0 }
  },
  budgets: {
    food: 0,
    transport: 0,
    entertainment: 0,
    shopping: 0
  },
  debts: [],
  subscriptions: [],
  transactions: []
};

const state = loadState();
let trendChart;

init();

function init() {
  setDefaultDates();
  bindForms();
  bindListActions();
  bindTabs();
  renderAll();
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return deepClone(defaultState);
    const parsed = JSON.parse(saved);
    return {
      ...deepClone(defaultState),
      ...parsed,
      emergency: { ...defaultState.emergency, ...(parsed.emergency || {}) },
      budgets: { ...defaultState.budgets, ...(parsed.budgets || {}) },
      investments: { ...defaultState.investments, ...(parsed.investments || {}) }
    };
  } catch (e) {
    console.error('Failed to load state', e);
    return deepClone(defaultState);
  }
}

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Unable to persist state', e);
  }
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function setDefaultDates() {
  const today = new Date().toISOString().slice(0, 10);
  document.querySelectorAll('input[type="date"]').forEach((input) => {
    if (!input.value) input.value = today;
  });
}

function bindForms() {
  document.getElementById('income-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const entry = {
      id: uid(),
      name: data.get('name'),
      amount: asNumber(data.get('amount')),
      date: data.get('date'),
      notes: data.get('notes') || ''
    };
    state.income.push(entry);
    addTransaction('Income', entry.name, entry.amount, entry.date, entry.notes);
    e.target.reset();
    setDefaultDates();
    persistAndRender();
  });

  document.getElementById('expenses-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const entry = {
      id: uid(),
      name: data.get('name'),
      amount: asNumber(data.get('amount')),
      category: data.get('category'),
      date: data.get('date'),
      notes: data.get('notes') || ''
    };
    state.expenses.push(entry);
    addTransaction('Expense', entry.category || entry.name, entry.amount, entry.date, entry.notes);
    e.target.reset();
    setDefaultDates();
    persistAndRender();
  });

  document.getElementById('assets-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    state.assets.push({ id: uid(), name: data.get('name'), amount: asNumber(data.get('amount')) });
    e.target.reset();
    persistAndRender();
  });

  document.getElementById('liabilities-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    state.liabilities.push({ id: uid(), name: data.get('name'), amount: asNumber(data.get('amount')) });
    e.target.reset();
    persistAndRender();
  });

  document.getElementById('emergency-target-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const target = asNumber(new FormData(e.target).get('target'));
    state.emergency.target = target;
    e.target.reset();
    persistAndRender();
  });

  document.getElementById('emergency-adjust-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const amount = asNumber(data.get('amount'));
    const action = data.get('action');
    if (action === 'add') state.emergency.saved += amount;
    else state.emergency.saved = Math.max(0, state.emergency.saved - amount);
    e.target.reset();
    persistAndRender();
  });

  document.getElementById('goal-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    state.goals.push({
      id: uid(),
      name: data.get('name'),
      target: asNumber(data.get('target')),
      saved: asNumber(data.get('saved')),
      type: data.get('type')
    });
    e.target.reset();
    persistAndRender();
  });

  document.getElementById('investment-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const category = data.get('category');
    state.investments[category] = {
      invested: asNumber(data.get('invested')),
      current: asNumber(data.get('current'))
    };
    e.target.reset();
    persistAndRender();
  });

  document.getElementById('budget-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    state.budgets.food = asNumber(data.get('food'));
    state.budgets.transport = asNumber(data.get('transport'));
    state.budgets.entertainment = asNumber(data.get('entertainment'));
    state.budgets.shopping = asNumber(data.get('shopping'));
    persistAndRender();
  });

  document.getElementById('debt-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    state.debts.push({
      id: uid(),
      name: data.get('name'),
      total: asNumber(data.get('total')),
      remaining: asNumber(data.get('remaining')),
      emi: asNumber(data.get('emi')),
      rate: asNumber(data.get('rate')),
      payoff: data.get('payoff')
    });
    e.target.reset();
    setDefaultDates();
    persistAndRender();
  });

  document.getElementById('subscription-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    state.subscriptions.push({
      id: uid(),
      name: data.get('name'),
      category: data.get('category'),
      amount: asNumber(data.get('amount')),
      billing: data.get('billing'),
      notes: data.get('notes') || ''
    });
    e.target.reset();
    setDefaultDates();
    persistAndRender();
  });

  document.getElementById('emi-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const p = asNumber(data.get('principal'));
    const annual = asNumber(data.get('rate')) / 100;
    const n = asNumber(data.get('tenure'));
    const monthlyRate = annual / 12;
    const emi = monthlyRate === 0 ? p / n : (p * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
    document.getElementById('emi-result').textContent = `${formatCurrency(emi || 0)} per month`;
  });
}

function bindListActions() {
  document.getElementById('income-list').addEventListener('click', (e) => {
    if (e.target.matches('button')) removeItem('income', e.target.dataset.id);
  });
  document.getElementById('expenses-list').addEventListener('click', (e) => {
    if (e.target.matches('button')) removeItem('expenses', e.target.dataset.id);
  });
  document.getElementById('assets-list').addEventListener('click', (e) => {
    if (e.target.matches('button')) removeItem('assets', e.target.dataset.id);
  });
  document.getElementById('liabilities-list').addEventListener('click', (e) => {
    if (e.target.matches('button')) removeItem('liabilities', e.target.dataset.id);
  });

  document.getElementById('goals-section').addEventListener('click', (e) => {
    if (!e.target.dataset.goalId) return;
    const id = e.target.dataset.goalId;
    const goal = state.goals.find((g) => g.id === id);
    if (!goal) return;
    if (e.target.dataset.action === 'delete') {
      state.goals = state.goals.filter((g) => g.id !== id);
    } else if (e.target.dataset.action === 'update') {
      const next = prompt('Update saved amount', goal.saved);
      if (next !== null) goal.saved = Math.min(goal.target, Math.max(0, asNumber(next)));
    }
    persistAndRender();
  });

  document.getElementById('debt-section').addEventListener('click', (e) => {
    const id = e.target.dataset.debtId;
    if (!id) return;
    const debt = state.debts.find((d) => d.id === id);
    if (!debt) return;
    if (e.target.dataset.action === 'delete') {
      state.debts = state.debts.filter((d) => d.id !== id);
    } else if (e.target.dataset.action === 'payment') {
      const payment = prompt('Payment amount', debt.emi);
      if (payment !== null) {
        debt.remaining = Math.max(0, debt.remaining - asNumber(payment));
      }
    }
    persistAndRender();
  });

  document.getElementById('subscriptions-section').addEventListener('click', (e) => {
    const id = e.target.dataset.subscriptionId;
    if (id) {
      state.subscriptions = state.subscriptions.filter((s) => s.id !== id);
      persistAndRender();
    }
  });
}

function removeItem(listKey, id) {
  state[listKey] = state[listKey].filter((item) => item.id !== id);
  persistAndRender();
}

function addTransaction(type, category, amount, date, notes) {
  state.transactions.unshift({ id: uid(), type, category, amount, date, notes });
  state.transactions = state.transactions.slice(0, 200); // prevent runaway
}

function persistAndRender() {
  persistState();
  renderAll();
}

function renderAll() {
  renderList('income', 'income-list');
  renderList('expenses', 'expenses-list');
  renderList('assets', 'assets-list');
  renderList('liabilities', 'liabilities-list');
  updateTotals();
  renderEmergency();
  renderGoals();
  renderInvestments();
  renderBudgets();
  renderDebts();
  renderSubscriptions();
  renderTransactions();
  renderMonthlyReport();
  renderTrendChart();
}

function renderList(key, elementId) {
  const container = document.getElementById(elementId);
  container.innerHTML = '';
  state[key].forEach((item) => {
    const li = document.createElement('li');
    const label = item.category ? `${item.name} · ${item.category}` : item.name;
    li.innerHTML = `<span>${label}</span><strong>${formatCurrency(item.amount)}</strong>`;
    const btn = document.createElement('button');
    btn.textContent = 'Delete';
    btn.dataset.id = item.id;
    li.appendChild(btn);
    container.appendChild(li);
  });
}

function updateTotals() {
  const totalIncome = sum(state.income);
  const totalExpenses = sum(state.expenses);
  const totalAssets = sum(state.assets);
  const totalLiabilities = sum(state.liabilities);
  const savings = totalIncome + totalAssets - totalLiabilities - totalExpenses;
  const cashflow = totalIncome - totalExpenses;
  document.getElementById('income-total').textContent = formatCurrency(totalIncome);
  document.getElementById('expenses-total').textContent = formatCurrency(totalExpenses);
  document.getElementById('assets-total').textContent = formatCurrency(totalAssets);
  document.getElementById('liabilities-total').textContent = formatCurrency(totalLiabilities);
  document.getElementById('savings-balance').textContent = formatCurrency(savings);
  document.getElementById('cashflow').textContent = formatCurrency(cashflow);
  document.getElementById('revenue-value').textContent = formatCurrency(totalIncome);
  const status = savings >= 0 ? 'Great! You are net positive this cycle.' : 'Warning: liabilities & expenses exceed inflows.';
  document.getElementById('savings-status').textContent = status;
  renderSavingsRate(totalIncome, savings);
}

function renderSavingsRate(totalIncome, savings) {
  const rate = totalIncome > 0 ? Math.max(0, (savings / totalIncome) * 100) : 0;
  const pct = Math.min(100, rate);
  document.getElementById('savings-meter-fill').style.width = `${pct}%`;
  document.getElementById('savings-meter-text').textContent = `${rate.toFixed(1)}%`;
  document.getElementById('header-savings-rate').textContent = `${rate.toFixed(1)}%`;
}

function renderEmergency() {
  const { target, saved } = state.emergency;
  const gap = Math.max(0, target - saved);
  document.getElementById('emergency-target').textContent = formatCurrency(target);
  document.getElementById('emergency-saved').textContent = formatCurrency(saved);
  document.getElementById('emergency-gap').textContent = formatCurrency(gap);
}

function renderGoals() {
  const shortContainer = document.getElementById('short-goals');
  const longContainer = document.getElementById('long-goals');
  shortContainer.innerHTML = '';
  longContainer.innerHTML = '';
  if (!state.goals.length) {
    shortContainer.innerHTML = '<p class="muted">Add your first goal.</p>';
    longContainer.innerHTML = '<p class="muted">Dream big and plan it.</p>';
    return;
  }
  state.goals.forEach((goal) => {
    const percent = goal.target ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
    const card = document.createElement('div');
    card.className = 'goal-card';
    card.innerHTML = `
      <strong>${goal.name}</strong>
      <small>${formatCurrency(goal.saved)} / ${formatCurrency(goal.target)}</small>
      <div class="goal-progress"><span style="width:${percent}%"></span></div>
      <div class="goal-actions">
        <button class="secondary" data-goal-id="${goal.id}" data-action="update">Update saved</button>
        <button data-goal-id="${goal.id}" data-action="delete">Delete</button>
      </div>
    `;
    if (goal.type === 'short') shortContainer.appendChild(card);
    else longContainer.appendChild(card);
  });
}

function renderInvestments() {
  const tbody = document.getElementById('investment-rows');
  tbody.innerHTML = '';
  let totalInvested = 0;
  let totalCurrent = 0;
  Object.entries(state.investments).forEach(([category, values]) => {
    totalInvested += values.invested;
    totalCurrent += values.current;
    const returns = values.invested ? (((values.current - values.invested) / values.invested) * 100).toFixed(2) : '0.00';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${category}</td>
      <td>${formatCurrency(values.invested)}</td>
      <td>${formatCurrency(values.current)}</td>
      <td>${returns}%</td>
    `;
    tbody.appendChild(row);
  });
  document.getElementById('investment-summary').textContent = `Total Invested ${formatCurrency(totalInvested)} · Current ${formatCurrency(totalCurrent)}`;
}

function renderBudgets() {
  const form = document.getElementById('budget-form');
  ['food', 'transport', 'entertainment', 'shopping'].forEach((key) => {
    const input = form.querySelector(`[name=\"${key}\"]`);
    if (input) input.value = state.budgets[key] || '';
  });
  const expensesByCategory = groupExpenses();
  const container = document.getElementById('budget-progress');
  container.innerHTML = '';
  Object.entries(state.budgets).forEach(([key, limit]) => {
    if (!limit) return;
    const spent = expensesByCategory[key] || 0;
    const remaining = Math.max(0, limit - spent);
    const percent = Math.min(100, (spent / limit) * 100);
    const div = document.createElement('div');
    div.className = 'progress-item';
    div.innerHTML = `
      <strong>${capitalize(key)}: ${formatCurrency(spent)} spent</strong>
      <p class="muted">Remaining ${formatCurrency(remaining)}</p>
      <div class="progress-bar"><span style="width:${percent}%"></span></div>
    `;
    container.appendChild(div);
  });
  if (!container.children.length) {
    container.innerHTML = '<p class="muted">Set a budget to start tracking.</p>';
  }
}

function renderDebts() {
  const container = document.getElementById('debt-list');
  container.innerHTML = '';
  if (!state.debts.length) {
    container.innerHTML = '<p class="muted">No loans being tracked.</p>';
    return;
  }
  state.debts.forEach((debt) => {
    const progress = debt.total ? (1 - debt.remaining / debt.total) * 100 : 0;
    const card = document.createElement('div');
    card.className = 'debt-card';
    card.innerHTML = `
      <strong>${debt.name}</strong>
      <p>Remaining ${formatCurrency(debt.remaining)} of ${formatCurrency(debt.total)}</p>
      <p>EMI ${formatCurrency(debt.emi)} · Rate ${debt.rate}%</p>
      <p class="muted">Payoff by ${formatDate(debt.payoff)}</p>
      <div class="progress-bar"><span style="width:${Math.min(100, Math.max(0, progress))}%"></span></div>
      <div class="goal-actions">
        <button class="secondary" data-debt-id="${debt.id}" data-action="payment">Log payment</button>
        <button data-debt-id="${debt.id}" data-action="delete">Remove</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderSubscriptions() {
  const container = document.getElementById('subscription-list');
  container.innerHTML = '';
  if (!state.subscriptions.length) {
    container.innerHTML = '<p class="muted">Add OTT, software or gym payments here.</p>';
    return;
  }
  state.subscriptions.forEach((sub) => {
    const card = document.createElement('div');
    card.className = 'subscription-card';
    card.innerHTML = `
      <strong>${sub.name}</strong>
      <p>${sub.category} · ${formatCurrency(sub.amount)} / month</p>
      <p class="muted">Next billing ${formatDate(sub.billing)} ${sub.notes ? '· ' + sub.notes : ''}</p>
      <button data-subscription-id="${sub.id}">Delete</button>
    `;
    container.appendChild(card);
  });
}

function renderTransactions() {
  const tbody = document.getElementById('transaction-rows');
  tbody.innerHTML = '';
  if (!state.transactions.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="muted">No transactions yet</td></tr>';
    return;
  }
  state.transactions.slice(0, 50).forEach((tx) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${tx.type}</td>
      <td>${tx.category || '-'}</td>
      <td>${formatCurrency(tx.amount)}</td>
      <td>${formatDate(tx.date)}</td>
      <td>${tx.notes || '-'}</td>
    `;
    tbody.appendChild(row);
  });
}

function renderMonthlyReport() {
  const totalIncome = sum(state.income);
  const totalExpenses = sum(state.expenses);
  const savings = totalIncome - totalExpenses;
  const expensesByCategory = groupExpenses();
  const [topCategory, topValue] = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1])[0] || [];
  const savingsRate = totalIncome > 0 ? ((savings / totalIncome) * 100).toFixed(1) : '0.0';
  document.getElementById('report-income').textContent = formatCurrency(totalIncome);
  document.getElementById('report-expenses').textContent = formatCurrency(totalExpenses);
  document.getElementById('report-category').textContent = topCategory ? `${capitalize(topCategory)} (${formatCurrency(topValue)})` : 'No spend yet';
  document.getElementById('report-savings-rate').textContent = `${savingsRate}%`;
}

function renderTrendChart() {
  const canvas = document.getElementById('trend-chart');
  if (!canvas) return;
  const series = buildMonthlySeries(6);
  if (trendChart) trendChart.destroy();
  trendChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: series.labels,
      datasets: [
        { label: 'Income', data: series.income, backgroundColor: '#4dd0e1' },
        { label: 'Expenses', data: series.expenses, backgroundColor: '#ff6b6b' },
        { label: 'Savings', data: series.savings, backgroundColor: '#7dd71d' }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#fff' } } },
      scales: {
        x: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } },
        y: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } }
      }
    }
  });
}

function buildMonthlySeries(months) {
  const map = {};
  const now = new Date();
  for (let i = months - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    map[key] = { income: 0, expense: 0 };
  }
  state.transactions.forEach((tx) => {
    if (!tx.date) return;
    const key = tx.date.slice(0, 7);
    if (!map[key]) return;
    if (tx.type === 'Income') map[key].income += tx.amount;
    if (tx.type === 'Expense') map[key].expense += tx.amount;
  });
  const labels = [];
  const income = [];
  const expenses = [];
  const savings = [];
  Object.entries(map).forEach(([key, value]) => {
    labels.push(formatMonth(key));
    income.push(value.income);
    expenses.push(value.expense);
    savings.push(value.income - value.expense);
  });
  return { labels, income, expenses, savings };
}

function groupExpenses() {
  return state.expenses.reduce((acc, expense) => {
    const key = (expense.category || 'other').toLowerCase();
    acc[key] = (acc[key] || 0) + expense.amount;
    return acc;
  }, {});
}

function sum(list) {
  return list.reduce((acc, item) => acc + (item.amount || 0), 0);
}

function asNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function uid() {
  return window.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value || 0);
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date)) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMonth(key) {
  const [year, month] = key.split('-');
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function bindTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;

      // Remove active class from all buttons and panels
      tabButtons.forEach((b) => b.classList.remove('active'));
      tabPanels.forEach((p) => p.classList.remove('active'));

      // Add active class to clicked button and corresponding panel
      btn.classList.add('active');
      const targetPanel = document.getElementById(`${targetTab}-tab`);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });
}
