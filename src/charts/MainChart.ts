import {DataLoader} from "../services/DataLoader";
import {ChartData} from "./ChartData";
import {ChartInteraction} from "./ChartInteraction";
import {ChartRenderer} from "./ChartRenderer";
import {UIController} from "../utils/UIController";

export class MainChart {
    private renderer: ChartRenderer;
    private dataController: ChartData;
    private eventManager: ChartInteraction;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private uiController: UIController;
    private symbol: string = 'EURUSD';

    constructor(canvasId: string, dataLoader: DataLoader) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.dataController = new ChartData(dataLoader);
        this.renderer = new ChartRenderer(this.ctx, this.canvas, this.dataController);
        this.eventManager = new ChartInteraction(this.canvas, this.renderer);
        this.uiController = new UIController(this.canvas);
    }

    async initialize(): Promise<void> {
        this.uiController.updateLayout()
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
            this.displayLoadingMessage("Loading data...");
        }, 1000);

        try {
            await this.dataController.loadData(this.symbol);
            window.clearTimeout(timeoutId);
            this.render();
        } catch (error) {
            console.error("Data loading failed:", error);
            this.displayLoadingMessage("Failed to load data.");
        } finally {
            window.clearTimeout(timeoutId);
            this.clearLoadingMessage();
        }
    }

    private displayLoadingMessage(message: string): void {
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(message, this.canvas.width / 2 - this.ctx.measureText(message).width / 2, this.canvas.height / 2);
    }

    private clearLoadingMessage(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.render();
    }

    private render(): void {
        this.renderer.render();
    }
}