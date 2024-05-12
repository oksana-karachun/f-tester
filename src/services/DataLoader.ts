import { DataLoaderConfig } from '../models/DataLoaderConfig';

export class DataLoader {
    private static readonly BASE_URL = 'https://beta.forextester.com/data/api/Metadata/bars/chunked';
    private broker: string;
    private symbol: string;
    private timeframe: number;
    private start: number;
    private end: number;
    private useMessagePack: boolean;

    constructor({ broker, symbol, timeframe, start, end, useMessagePack = false }: DataLoaderConfig) {
        this.broker = broker;
        this.symbol = symbol;
        this.timeframe = timeframe;
        this.start = start;
        this.end = end;
        this.useMessagePack = useMessagePack;
    }

    public async loadData(symbol: string): Promise<any> {
        this.symbol = symbol;

        const url = `${DataLoader.BASE_URL}?Broker=${encodeURIComponent(this.broker)}&` +
            `Symbol=${encodeURIComponent(this.symbol)}&Timeframe=${this.timeframe}&` +
            `Start=${this.start}&End=${this.end}&UseMessagePack=${this.useMessagePack}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    }
}