class AnnotationRenderService {
    constructor(container, featureRenderer) {
        this.container = container;
        this.featureRenderer = featureRenderer;
        
        // Create canvas element
        this.canvas = container.querySelector('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.boundResizeHandler = this.resizeCanvas.bind(this);
        window.addEventListener('resize', this.boundResizeHandler);

        // Initial resize
        this.resizeCanvas();
    }

    resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const { width, height } = this.container.getBoundingClientRect();

        // Set the canvas size in pixels
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;

        // Scale the canvas context to match the device pixel ratio
        this.ctx.scale(dpr, dpr);

        // Set the canvas CSS size to match the container
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`

        if (this.drawConfig) {
            this.render(this.drawConfig);
        } else {
            this.ctx.clearRect(0, 0, width, height);
        }

    }

    render(drawConfig) {
        this.drawConfig = drawConfig
        this.featureRenderer.draw(drawConfig)
    }
} 

export default AnnotationRenderService;