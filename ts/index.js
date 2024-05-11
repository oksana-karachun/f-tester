import { Chart } from "./classes/Chart";
const chart = new Chart('chartCanvas', 'Advanced', 'EURUSD', 1, 57674, 59113);
document.getElementById('marketUSDJPY').addEventListener('click', () => chart.changeMarket('USDJPY'));
document.getElementById('marketEURUSD').addEventListener('click', () => chart.changeMarket('EURUSD'));
