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
let incomeExpensesChart;
let savingsRateChart;
let expenseCategoryChart;
let investmentRatioChart;
let netWorthChart;
let cashflowTrendChart;
let expenseTrendChart;
let budgetVsActualChart;

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
  renderAnalyticsCharts();
  renderSuggestions();
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
        // Re-render analytics charts when analytics tab is opened
        if (targetTab === 'analytics') {
          renderAnalyticsCharts();
        }
        // Re-render suggestions when suggestions tab is opened
        if (targetTab === 'suggestions') {
          renderSuggestions();
        }
      }
    });
  });
}

function renderAnalyticsCharts() {
  renderIncomeExpensesChart();
  renderSavingsRateChart();
  renderExpenseCategoryChart();
  renderInvestmentRatioChart();
  renderNetWorthChart();
  renderCashflowTrendChart();
  renderExpenseTrendChart();
  renderBudgetVsActualChart();
  renderEmergencyGauge();
}

function renderIncomeExpensesChart() {
  const canvas = document.getElementById('income-expenses-chart');
  if (!canvas) return;
  const series = buildMonthlySeries(6);
  if (incomeExpensesChart) incomeExpensesChart.destroy();
  incomeExpensesChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: series.labels,
      datasets: [
        {
          label: 'Income',
          data: series.income,
          backgroundColor: '#4dd0e1',
          borderRadius: 4
        },
        {
          label: 'Expenses',
          data: series.expenses,
          backgroundColor: '#ff6b6b',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: '#fff' } },
        title: { display: false }
      },
      scales: {
        x: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } },
        y: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } }
      }
    }
  });
}

function renderSavingsRateChart() {
  const canvas = document.getElementById('savings-rate-chart');
  if (!canvas) return;
  const series = buildMonthlySeries(6);
  const savingsRates = series.labels.map((_, i) => {
    const income = series.income[i];
    const savings = series.savings[i];
    return income > 0 ? (savings / income) * 100 : 0;
  });
  if (savingsRateChart) savingsRateChart.destroy();
  savingsRateChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: series.labels,
      datasets: [
        {
          label: 'Savings Rate %',
          data: savingsRates,
          borderColor: '#7dd71d',
          backgroundColor: 'rgba(125, 215, 29, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: '#7dd71d',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: '#fff' } },
        title: { display: false }
      },
      scales: {
        x: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } },
        y: {
          ticks: { color: '#fff', callback: (value) => `${value}%` },
          grid: { color: 'rgba(255,255,255,0.1)' }
        }
      }
    }
  });
}

function renderExpenseCategoryChart() {
  const canvas = document.getElementById('expense-category-chart');
  if (!canvas) return;
  const expensesByCategory = groupExpenses();
  const labels = Object.keys(expensesByCategory).map(capitalize);
  const data = Object.values(expensesByCategory);
  const colors = ['#ff6b6b', '#4dd0e1', '#7dd71d', '#f6c343', '#ffa726', '#ab47bc', '#26a69a'];
  if (expenseCategoryChart) expenseCategoryChart.destroy();
  expenseCategoryChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#3d4148'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#fff', padding: 15 }
        },
        title: { display: false }
      }
    }
  });
}

function renderInvestmentRatioChart() {
  const canvas = document.getElementById('investment-ratio-chart');
  if (!canvas) return;
  const investments = state.investments;
  const labels = [];
  const data = [];
  Object.entries(investments).forEach(([category, values]) => {
    if (values.invested > 0) {
      labels.push(category);
      data.push(values.invested);
    }
  });
  const colors = ['#4dd0e1', '#7dd71d', '#f6c343', '#ffa726', '#ab47bc'];
  if (investmentRatioChart) investmentRatioChart.destroy();
  if (labels.length === 0) return;
  investmentRatioChart = new Chart(canvas, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#3d4148'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#fff', padding: 15 }
        },
        title: { display: false }
      }
    }
  });
}

function renderNetWorthChart() {
  const canvas = document.getElementById('net-worth-chart');
  if (!canvas) return;
  const series = buildMonthlySeries(6);
  const totalAssets = sum(state.assets);
  const totalLiabilities = sum(state.liabilities);
  const currentNetWorth = totalAssets - totalLiabilities;
  // Calculate approximate net worth trend: start with current, work backwards
  // This is a simplified calculation - in reality you'd track asset/liability changes over time
  const netWorths = [];
  let runningNetWorth = currentNetWorth;
  for (let i = series.labels.length - 1; i >= 0; i--) {
    // Approximate: subtract monthly savings to work backwards
    const monthlySavings = series.savings[i] || 0;
    netWorths.unshift(runningNetWorth);
    runningNetWorth -= monthlySavings;
  }
  if (netWorthChart) netWorthChart.destroy();
  netWorthChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: series.labels,
      datasets: [
        {
          label: 'Net Worth (Assets − Liabilities)',
          data: netWorths,
          borderColor: '#4dd0e1',
          backgroundColor: 'rgba(77, 208, 225, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: '#4dd0e1',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: '#fff' } },
        title: { display: false }
      },
      scales: {
        x: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } },
        y: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } }
      }
    }
  });
}

function renderCashflowTrendChart() {
  const canvas = document.getElementById('cashflow-trend-chart');
  if (!canvas) return;
  const series = buildMonthlySeries(6);
  if (cashflowTrendChart) cashflowTrendChart.destroy();
  cashflowTrendChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: series.labels,
      datasets: [
        {
          label: 'Cashflow',
          data: series.savings,
          backgroundColor: series.savings.map((val) => (val >= 0 ? '#7dd71d' : '#ff6b6b')),
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: '#fff' } },
        title: { display: false }
      },
      scales: {
        x: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } },
        y: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } }
      }
    }
  });
}

function renderExpenseTrendChart() {
  const canvas = document.getElementById('expense-trend-chart');
  if (!canvas) return;
  const series = buildMonthlySeries(6);
  if (expenseTrendChart) expenseTrendChart.destroy();
  expenseTrendChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: series.labels,
      datasets: [
        {
          label: 'Monthly Expenses',
          data: series.expenses,
          borderColor: '#ff6b6b',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: '#ff6b6b',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: '#fff' } },
        title: { display: false }
      },
      scales: {
        x: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } },
        y: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } }
      }
    }
  });
}

function renderBudgetVsActualChart() {
  const canvas = document.getElementById('budget-vs-actual-chart');
  if (!canvas) return;
  const expensesByCategory = groupExpenses();
  const categories = ['food', 'transport', 'entertainment', 'shopping'];
  const labels = categories.map(capitalize).filter((cat) => state.budgets[cat.toLowerCase()] > 0);
  const budgetData = categories
    .filter((cat) => state.budgets[cat] > 0)
    .map((cat) => state.budgets[cat]);
  const actualData = categories
    .filter((cat) => state.budgets[cat] > 0)
    .map((cat) => expensesByCategory[cat] || 0);
  if (budgetVsActualChart) budgetVsActualChart.destroy();
  if (labels.length === 0) return;
  budgetVsActualChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Budget',
          data: budgetData,
          backgroundColor: '#4dd0e1',
          borderRadius: 4
        },
        {
          label: 'Actual',
          data: actualData,
          backgroundColor: '#ff6b6b',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: '#fff' } },
        title: { display: false }
      },
      scales: {
        x: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } },
        y: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } }
      }
    }
  });
}

function renderEmergencyGauge() {
  const { target, saved } = state.emergency;
  const percent = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
  const degrees = (percent / 100) * 360;
  const gaugeFill = document.getElementById('emergency-gauge-fill');
  if (gaugeFill) {
    gaugeFill.style.background = `conic-gradient(
      var(--success) 0deg,
      var(--success) ${degrees}deg,
      transparent ${degrees}deg,
      transparent 360deg
    )`;
  }
  const gaugePercent = document.getElementById('emergency-gauge-percent');
  if (gaugePercent) gaugePercent.textContent = `${percent.toFixed(1)}%`;
  const gaugeDetails = document.getElementById('emergency-gauge-details');
  if (gaugeDetails) gaugeDetails.textContent = `${formatCurrency(saved)} / ${formatCurrency(target)}`;
  const gaugeTarget = document.getElementById('emergency-gauge-target');
  if (gaugeTarget) gaugeTarget.textContent = formatCurrency(target);
  const gaugeSaved = document.getElementById('emergency-gauge-saved');
  if (gaugeSaved) gaugeSaved.textContent = formatCurrency(saved);
  const gaugeRemaining = document.getElementById('emergency-gauge-remaining');
  if (gaugeRemaining) gaugeRemaining.textContent = formatCurrency(Math.max(0, target - saved));
}

function generateFinancialSuggestions() {
  const suggestions = [];
  const totalIncome = sum(state.income);
  const totalExpenses = sum(state.expenses);
  const totalAssets = sum(state.assets);
  const totalLiabilities = sum(state.liabilities);
  const savings = totalIncome + totalAssets - totalLiabilities - totalExpenses;
  const cashflow = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;
  const expensesByCategory = groupExpenses();
  const series = buildMonthlySeries(3);
  const monthlyExpenses = series.expenses;
  const needsCategories = ['Food', 'Transport', 'Utilities', 'Health'];
  const wantsCategories = ['Entertainment', 'Shopping', 'Other'];

  // Rule 1: 50-30-20 Rule Check
  if (totalIncome > 0) {
    const needsSpend = needsCategories.reduce((acc, cat) => acc + (expensesByCategory[cat.toLowerCase()] || 0), 0);
    const wantsSpend = wantsCategories.reduce((acc, cat) => acc + (expensesByCategory[cat.toLowerCase()] || 0), 0);
    const needsPercent = (needsSpend / totalIncome) * 100;
    const wantsPercent = (wantsSpend / totalIncome) * 100;
    const savingsPercent = savingsRate;

    if (needsPercent > 50) {
      suggestions.push({
        type: 'budget',
        category: 'budget',
        severity: 'high',
        title: 'Needs Exceed 50% Rule',
        message: `Your needs spending is ${needsPercent.toFixed(1)}% of income. Target: ≤50%. Consider meal planning, cheaper transport options, or utility optimization.`,
        action: 'Review and reduce essential category spending'
      });
    }
    if (wantsPercent > 30) {
      suggestions.push({
        type: 'budget',
        category: 'budget',
        severity: 'medium',
        title: 'Wants Exceed 30% Rule',
        message: `Your wants spending is ${wantsPercent.toFixed(1)}% of income. Target: ≤30%. Try limiting entertainment to weekends only or reduce shopping frequency.`,
        action: 'Cut discretionary spending by 10-15%'
      });
    }
    if (savingsPercent < 20) {
      suggestions.push({
        type: 'savings',
        category: 'savings',
        severity: 'high',
        title: 'Savings Below 20% Rule',
        message: `Your savings rate is ${savingsPercent.toFixed(1)}%. Target: ≥20%. Automate 20% of income to savings before spending.`,
        action: 'Set up automatic transfer of 20% income to savings'
      });
    }
  }

  // Rule 2: Pareto Spending Rule (80-20)
  const sortedCategories = Object.entries(expensesByCategory)
    .sort((a, b) => b[1] - a[1]);
  const top20PercentCategories = Math.ceil(sortedCategories.length * 0.2);
  const topCategoriesSpend = sortedCategories.slice(0, top20PercentCategories).reduce((acc, [, val]) => acc + val, 0);
  const totalSpend = totalExpenses;
  if (totalSpend > 0 && topCategoriesSpend / totalSpend > 0.8) {
    const topCategory = sortedCategories[0];
    suggestions.push({
      type: 'optimization',
      category: 'budget',
      severity: 'medium',
      title: 'Pareto Rule: Focus on Top Categories',
      message: `${capitalize(topCategory[0])} accounts for ${((topCategory[1] / totalSpend) * 100).toFixed(1)}% of spending. Top 20% categories drive 80% of expenses. Optimize these first.`,
      action: `Review and optimize ${capitalize(topCategory[0])} spending`
    });
  }

  // Rule 3: Savings Rate Health Check
  if (savingsRate < 20 && totalIncome > 0) {
    suggestions.push({
      type: 'savings',
      category: 'savings',
      severity: 'high',
      title: 'Low Savings Rate Warning',
      message: `Your savings rate is ${savingsRate.toFixed(1)}%. Aim for at least 20%. Consider reducing expenses or increasing income streams.`,
      action: 'Increase savings rate to 20% minimum'
    });
  } else if (savingsRate > 50 && totalIncome > 0) {
    suggestions.push({
      type: 'investments',
      category: 'investments',
      severity: 'low',
      title: 'Excellent Savings Rate!',
      message: `Amazing! Your savings rate is ${savingsRate.toFixed(1)}%. Consider investing surplus in SIP, FD, or stocks for better returns.`,
      action: 'Start investing 30-40% of surplus in diversified portfolio'
    });
  }

  // Rule 4: Lifestyle Creep Detection
  if (monthlyExpenses.length >= 3) {
    const isIncreasing = monthlyExpenses.every((val, i) => i === 0 || val >= monthlyExpenses[i - 1]);
    if (isIncreasing && monthlyExpenses[2] > monthlyExpenses[0] * 1.1) {
      const increasePercent = ((monthlyExpenses[2] - monthlyExpenses[0]) / monthlyExpenses[0]) * 100;
      suggestions.push({
        type: 'lifestyle',
        category: 'general',
        severity: 'medium',
        title: 'Lifestyle Creep Detected',
        message: `Your expenses increased ${increasePercent.toFixed(1)}% over 3 months. This is lifestyle creep. Review recent purchases and cut non-essential upgrades.`,
        action: 'Freeze spending on wants for next month'
      });
    }
  }

  // Rule 5: Emergency Fund Status
  const { target, saved } = state.emergency;
  const monthlyExpenseAvg = totalExpenses > 0 ? totalExpenses / Math.max(1, state.expenses.length) : 0;
  const threeMonthsExpenses = monthlyExpenseAvg * 3;
  if (target > 0) {
    const percentComplete = (saved / target) * 100;
    if (percentComplete < 100) {
      suggestions.push({
        type: 'emergency',
        category: 'emergency',
        severity: percentComplete < 50 ? 'high' : 'medium',
        title: 'Emergency Fund Progress',
        message: `Emergency fund is ${percentComplete.toFixed(1)}% complete (${formatCurrency(saved)} / ${formatCurrency(target)}). Target: 3-6 months of expenses.`,
        action: `Save ${formatCurrency(target - saved)} more to reach target`
      });
    }
  } else if (threeMonthsExpenses > 0) {
    suggestions.push({
      type: 'emergency',
      category: 'emergency',
      severity: 'high',
      title: 'Emergency Fund Not Set',
      message: `Set an emergency fund target of ${formatCurrency(threeMonthsExpenses)} (3 months expenses). This is your financial safety net.`,
      action: `Set emergency fund target to ${formatCurrency(threeMonthsExpenses)}`
    });
  }

  // Rule 6: Budget vs Actual
  Object.entries(state.budgets).forEach(([category, limit]) => {
    if (limit > 0) {
      const actual = expensesByCategory[category] || 0;
      const overspend = actual - limit;
      if (overspend > 0) {
        suggestions.push({
          type: 'overspending',
          category: 'budget',
          severity: overspend > limit * 0.2 ? 'high' : 'medium',
          title: `Overspending: ${capitalize(category)}`,
          message: `You overspent ${formatCurrency(overspend)} on ${category} (Budget: ${formatCurrency(limit)}, Actual: ${formatCurrency(actual)}).`,
          action: `Reduce ${category} spending by ${formatCurrency(overspend)} next month`
        });
      } else if (actual < limit * 0.7) {
        suggestions.push({
          type: 'budget',
          category: 'budget',
          severity: 'low',
          title: `Budget Adjustment: ${capitalize(category)}`,
          message: `You're spending ${formatCurrency(actual)} vs budget ${formatCurrency(limit)} on ${category}. Consider reducing budget to match actual.`,
          action: `Adjust ${category} budget to ${formatCurrency(actual)}`
        });
      }
    }
  });

  // Rule 7: Daily Spending Allowance
  if (totalIncome > 0) {
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const currentDay = new Date().getDate();
    const remainingDays = daysInMonth - currentDay;
    const monthlyBudget = Object.values(state.budgets).reduce((acc, val) => acc + val, 0) || totalIncome * 0.8;
    const spentThisMonth = totalExpenses;
    const remainingBudget = Math.max(0, monthlyBudget - spentThisMonth);
    const dailyAllowance = remainingDays > 0 ? remainingBudget / remainingDays : 0;
    if (dailyAllowance > 0 && dailyAllowance < totalIncome * 0.05) {
      suggestions.push({
        type: 'budget',
        category: 'budget',
        severity: 'medium',
        title: 'Low Daily Spending Allowance',
        message: `You have ${formatCurrency(remainingBudget)} left for ${remainingDays} days. Daily allowance: ${formatCurrency(dailyAllowance)}. Be mindful of spending.`,
        action: 'Track daily expenses to stay within allowance'
      });
    }
  }

  // Rule 8: Subscription Waste Detector
  const totalSubscriptionCost = state.subscriptions.reduce((acc, sub) => acc + sub.amount, 0);
  if (totalSubscriptionCost > totalIncome * 0.1 && totalIncome > 0) {
    suggestions.push({
      type: 'subscriptions',
      category: 'general',
      severity: 'high',
      title: 'High Subscription Costs',
      message: `Subscriptions cost ${formatCurrency(totalSubscriptionCost)} (${((totalSubscriptionCost / totalIncome) * 100).toFixed(1)}% of income). Review and cancel unused services.`,
      action: 'Audit subscriptions and cancel unused ones'
    });
  }
  state.subscriptions.forEach((sub) => {
    if (sub.amount > totalIncome * 0.1 && totalIncome > 0) {
      suggestions.push({
        type: 'subscriptions',
        category: 'general',
        severity: 'medium',
        title: `Expensive Subscription: ${sub.name}`,
        message: `${sub.name} costs ${formatCurrency(sub.amount)}/month (${((sub.amount / totalIncome) * 100).toFixed(1)}% of income). Consider cheaper alternatives.`,
        action: `Review ${sub.name} subscription and find alternatives`
      });
    }
  });

  // Rule 9: High-Spend Day Detector
  const expensesByDate = {};
  state.expenses.forEach((exp) => {
    if (exp.date) {
      expensesByDate[exp.date] = (expensesByDate[exp.date] || 0) + exp.amount;
    }
  });
  const dailyAverages = Object.values(expensesByDate);
  if (dailyAverages.length > 0) {
    const avgDailySpend = dailyAverages.reduce((a, b) => a + b, 0) / dailyAverages.length;
    Object.entries(expensesByDate).forEach(([date, amount]) => {
      if (amount > avgDailySpend * 2) {
        suggestions.push({
          type: 'spike',
          category: 'general',
          severity: 'medium',
          title: 'High Spending Day Detected',
          message: `You spent ${formatCurrency(amount)} on ${formatDate(date)} (${(amount / avgDailySpend).toFixed(1)}× average). Review what caused this spike.`,
          action: 'Identify spike cause and avoid similar patterns'
        });
      }
    });
  }

  // Rule 10: Cashflow Review
  if (cashflow < 0) {
    suggestions.push({
      type: 'cashflow',
      category: 'general',
      severity: 'high',
      title: 'Negative Cashflow Warning',
      message: `Your cashflow is negative (${formatCurrency(Math.abs(cashflow))}). Expenses exceed income. Urgently cut spending or increase income.`,
      action: 'Reduce expenses by 20% or find additional income sources'
    });
  } else if (cashflow > totalIncome * 0.3 && totalIncome > 0) {
    suggestions.push({
      type: 'investments',
      category: 'investments',
      severity: 'low',
      title: 'Surplus Cash Available',
      message: `You have ${formatCurrency(cashflow)} surplus monthly. Consider investing in SIP (₹500+), FD, or emergency fund.`,
      action: 'Start SIP with ₹500-1000 monthly surplus'
    });
  }

  // Rule 11: Expenses Category Optimizer
  const foodSpend = expensesByCategory.food || 0;
  const transportSpend = expensesByCategory.transport || 0;
  if (foodSpend > 0 && transportSpend > 0) {
    if (foodSpend > transportSpend * 2) {
      suggestions.push({
        type: 'optimization',
        category: 'budget',
        severity: 'medium',
        title: 'Food Spending High',
        message: `Food spending (${formatCurrency(foodSpend)}) is ${(foodSpend / transportSpend).toFixed(1)}× transport. Try meal planning, batch cooking, or limit food delivery to 2× per week.`,
        action: 'Plan weekly meals and reduce food delivery frequency'
      });
    }
    if (transportSpend > foodSpend * 1.5) {
      suggestions.push({
        type: 'optimization',
        category: 'budget',
        severity: 'medium',
        title: 'Transport Spending High',
        message: `Transport spending (${formatCurrency(transportSpend)}) is high. Consider monthly passes, shared rides, or carpooling to save money.`,
        action: 'Switch to monthly transport passes or shared rides'
      });
    }
  }

  // Rule 12: Debt Handling
  if (state.debts.length > 0) {
    const totalDebt = state.debts.reduce((acc, debt) => acc + debt.remaining, 0);
    const highestInterestDebt = [...state.debts].sort((a, b) => b.rate - a.rate)[0];
    const smallestDebt = [...state.debts].sort((a, b) => a.remaining - b.remaining)[0];
    if (cashflow > 0) {
      if (highestInterestDebt.rate > 10) {
        suggestions.push({
          type: 'debt',
          category: 'debt',
          severity: 'high',
          title: 'High Interest Debt Priority',
          message: `${highestInterestDebt.name} has ${highestInterestDebt.rate}% interest. Use Avalanche method: pay extra on highest interest debt first.`,
          action: `Pay extra ${formatCurrency(cashflow * 0.3)} monthly on ${highestInterestDebt.name}`
        });
      } else {
        suggestions.push({
          type: 'debt',
          category: 'debt',
          severity: 'medium',
          title: 'Debt Payoff Strategy',
          message: `Total debt: ${formatCurrency(totalDebt)}. Use Snowball method: pay off ${smallestDebt.name} first for quick wins, then tackle larger debts.`,
          action: `Pay extra on ${smallestDebt.name} to eliminate it faster`
        });
      }
    }
  }

  // Rule 13: Goal Progress
  state.goals.forEach((goal) => {
    const progress = goal.target > 0 ? (goal.saved / goal.target) * 100 : 0;
    if (progress < 20) {
      const monthlyNeeded = (goal.target - goal.saved) / 12;
      suggestions.push({
        type: 'goals',
        category: 'general',
        severity: 'medium',
        title: `Goal Progress: ${goal.name}`,
        message: `${goal.name} is ${progress.toFixed(1)}% complete. Save ${formatCurrency(monthlyNeeded)}/month to reach target in 12 months.`,
        action: `Increase monthly savings for ${goal.name} by ${formatCurrency(monthlyNeeded)}`
      });
    } else if (progress > 70 && progress < 100) {
      suggestions.push({
        type: 'goals',
        category: 'general',
        severity: 'low',
        title: `Goal Almost Complete: ${goal.name}`,
        message: `${goal.name} is ${progress.toFixed(1)}% complete! Just ${formatCurrency(goal.target - goal.saved)} left. Consider finishing it sooner.`,
        action: `Accelerate savings to complete ${goal.name} faster`
      });
    }
  });

  // Rule 14: Investment Suggestion Logic
  const totalInvested = Object.values(state.investments).reduce((acc, inv) => acc + inv.invested, 0);
  if (cashflow > totalIncome * 0.2 && totalIncome > 0 && totalInvested === 0) {
    suggestions.push({
      type: 'investments',
      category: 'investments',
      severity: 'medium',
      title: 'Start Investing',
      message: `You have ${formatCurrency(cashflow)} monthly surplus but no investments. Start small with ₹500 SIP in mutual funds for long-term wealth.`,
      action: 'Start ₹500 monthly SIP in diversified mutual fund'
    });
  } else if (cashflow > totalIncome * 0.2 && totalIncome > 0) {
    suggestions.push({
      type: 'investments',
      category: 'investments',
      severity: 'low',
      title: 'Increase Investments',
      message: `You have ${formatCurrency(cashflow)} monthly surplus. Consider increasing SIP or diversifying into stocks, gold, or FD.`,
      action: 'Increase monthly SIP or add new investment category'
    });
  }

  // Rule 15: Transport vs Food Ratio Check (already covered in Rule 11, but adding specific tips)
  if (foodSpend > transportSpend * 2 && foodSpend > 0) {
    suggestions.push({
      type: 'optimization',
      category: 'budget',
      severity: 'low',
      title: 'Food Optimization Tips',
      message: `Food spending is high. Try: meal prep on weekends, buy groceries in bulk, limit restaurant visits to weekends, use cashback apps.`,
      action: 'Implement meal planning and reduce food delivery'
    });
  }

  return suggestions.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
}

function renderSuggestions() {
  const container = document.getElementById('suggestions-container');
  if (!container) return;
  const suggestions = generateFinancialSuggestions();
  container.innerHTML = '';
  if (suggestions.length === 0) {
    container.innerHTML = '<p class="muted" style="text-align: center; padding: 2rem;">Great job! No urgent suggestions at the moment. Keep up the good financial habits!</p>';
    return;
  }
  suggestions.forEach((suggestion) => {
    const card = document.createElement('div');
    card.className = `suggestion-card suggestion-${suggestion.severity}`;
    const iconMap = {
      high: '⚠️',
      medium: '💡',
      low: '✅'
    };
    const categoryIcons = {
      savings: '💰',
      budget: '📊',
      investments: '📈',
      emergency: '🛡️',
      debt: '💳',
      general: '💬'
    };
    card.innerHTML = `
      <div class="suggestion-header">
        <span class="suggestion-icon">${iconMap[suggestion.severity]} ${categoryIcons[suggestion.category] || '💡'}</span>
        <span class="suggestion-severity severity-${suggestion.severity}">${suggestion.severity}</span>
      </div>
      <h3 class="suggestion-title">${suggestion.title}</h3>
      <p class="suggestion-message">${suggestion.message}</p>
      <div class="suggestion-action">
        <strong>Action:</strong> ${suggestion.action}
      </div>
    `;
    container.appendChild(card);
  });
}
