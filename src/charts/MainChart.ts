import { DataLoader } from "../services/DataLoader";
import { ChartData } from "./ChartData";
import { ChartInteraction } from "./ChartInteraction";
import { ChartRenderer } from "./ChartRenderer";
import { UIController } from "../utils/UIController";

export class MainChart {
    private renderer: ChartRenderer;
    private dataController: ChartData;
    private eventManager: ChartInteraction;
    private uiController: UIController;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private symbol: string = 'EURUSD';

    constructor(canvasId: string, dataLoader: DataLoader) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.dataController = new ChartData(dataLoader);
        this.renderer = new ChartRenderer(this.ctx, this.canvas, this.dataController);
        this.eventManager = new ChartInteraction(this.canvas, this.renderer);
        this.uiController = new UIController();
    }

    async initialize(): Promise<void> {
        await this.loadAndDraw();
    }

    public async changeMarket(symbol: string) {
        if (symbol !== this.symbol) {
            this.symbol = symbol;
            await this.loadAndDraw();
        }
    }

    private async loadAndDraw(): Promise<void> {
        let timeoutId: number = window.setTimeout(() => {
            this.renderer.displayMessage("Loading data...");
        }, 100);

        try {
            await this.dataController.loadData(this.symbol);
            window.clearTimeout(timeoutId);
            this.render();
        } catch (error) {
            console.error("Data loading failed:", error);
            this.renderer.displayMessage("Failed to load data.");
        } finally {
            window.clearTimeout(timeoutId);
        }
    }

    private render(): void {
        this.renderer.render();
    }
}