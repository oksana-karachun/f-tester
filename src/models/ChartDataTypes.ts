import { BarData } from './Bar';

export interface Chunk {
    ChunkStart: number;
    Bars: BarData[];
}

export interface ChunkData extends Array<Chunk> {}
