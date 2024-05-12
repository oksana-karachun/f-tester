import {DataLoader} from "./services/DataLoader";
import {MainChart} from "./charts/MainChart";
import {DataLoaderConfig} from "./models/DataLoaderConfig";

const dataLoaderConfig: DataLoaderConfig = {
    broker: 'Advanced',
    symbol: 'EURUSD',
    timeframe: 1,
    start: 57674,
    end: 59113
};

const dataLoader = new DataLoader(dataLoaderConfig);
const mainChart = new MainChart('chartCanvas', dataLoader);

mainChart.initialize();
document.getElementById('marketUSDJPY').addEventListener('click', () => mainChart.changeMarket('USDJPY'));
document.getElementById('marketEURUSD').addEventListener('click', () => mainChart.changeMarket('EURUSD'));