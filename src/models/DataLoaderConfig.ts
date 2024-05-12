export interface DataLoaderConfig {
    broker: string;
    symbol: string;
    timeframe: number;
    start: number;
    end: number;
    useMessagePack?: boolean;
}