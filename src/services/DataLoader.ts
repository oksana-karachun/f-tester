import { DataLoaderConfig } from '../models/DataLoaderConfig';

export class DataLoader {
    private static readonly BASE_URL = 'https://beta.forextester.com/data/api/Metadata/bars/chunked';
    private _broker: string;
    private _symbol: string;
    private _timeframe: number;
    private _start: number;
    private _end: number;
    private _useMessagePack: boolean;

    constructor({ broker, symbol, timeframe, start, end, useMessagePack = false }: DataLoaderConfig) {
        this._broker = broker;
        this._symbol = symbol;
        this._timeframe = timeframe;
        this._start = start;
        this._end = end;
        this._useMessagePack = useMessagePack;
    }

    public async loadData(symbol: string): Promise<any> {
        this._symbol = symbol;

        const url = `${DataLoader.BASE_URL}?Broker=${encodeURIComponent(this._broker)}&` +
            `Symbol=${encodeURIComponent(this._symbol)}&Timeframe=${this._timeframe}&` +
            `Start=${this._start}&End=${this._end}&UseMessagePack=${this._useMessagePack}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    }
}