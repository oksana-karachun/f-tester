import { Bar } from '../models/Bar';
import { DataLoader } from '../services/DataLoader';
import { ChunkData } from "../models/ChartDataTypes";

export class ChartData {
    private bars: Bar[] = [];
    private dataLoader: DataLoader;

    constructor(dataLoader: DataLoader) {
        this.dataLoader = dataLoader;
    }

    async loadData(symbol: string): Promise<void> {
        const data: ChunkData = await this.dataLoader.loadData(symbol);
        this.processData(data);
    }

    private processData(chunks: ChunkData): void {
        const globalStartTime = Math.min(...chunks.map((chunk: { ChunkStart: any; }) => chunk.ChunkStart));
        this.bars = chunks.flatMap((chunk: { Bars: any[]; ChunkStart: any; }) => chunk.Bars.map(barData => new Bar(
            new Date((chunk.ChunkStart + barData.Time) * 1000),
            barData.Open,
            barData.High,
            barData.Low,
            barData.Close,
            barData.TickVolume,
            chunk.ChunkStart + barData.Time - globalStartTime
        )));
    }

    public getBars(): Bar[] {
        return this.bars;
    }
}
