import { GenomicRegion } from '../models/genomicRegion.js'
import { TrackConfig } from '../models/track.js'
import { DataLoader } from '../data/dataLoader.js'
import { ViewModelBuilder } from '../viewmodel/viewModelBuilder.js'
import { UIManager } from '../ui/uiManager.js'
import { RendererRegistry } from '../render/rendererRegistry.js'

/**
 * Minimal genome browser - orchestrates data loading, view model creation, and rendering
 */
export class MinimalBrowser {
    constructor(container, config) {
        if (!container || !(container instanceof HTMLElement)) {
            throw new Error('Container must be a valid HTML element')
        }
        
        this.container = container
        this.config = config
        this.ui = new UIManager(container)
        this.dataLoader = new DataLoader()
        this.viewModels = []
        this.trackConfigs = []
    }

    /**
     * Load and render all tracks for the configured locus
     */
    async load() {
        try {
            // 1. Parse locus into genomic region
            this.region = GenomicRegion.parse(this.config.locus)
            
            // 2. Create track configurations
            if (!this.config.tracks || this.config.tracks.length === 0) {
                throw new Error('No tracks configured')
            }
            
            this.trackConfigs = this.config.tracks.map(t => new TrackConfig(t))
            
            // 3. Fetch all track data in parallel
            const dataPromises = this.trackConfigs.map(config =>
                this.dataLoader.load(config, this.region)
            )
            
            const trackData = await Promise.all(dataPromises)
            
            // 4. Build view models
            const availableWidth = this.ui.getAvailableWidth()
            this.viewModels = trackData.map((data, i) =>
                ViewModelBuilder.build(
                    this.trackConfigs[i],
                    data,
                    this.region,
                    {
                        width: availableWidth,
                        height: this.trackConfigs[i].height
                    }
                )
            )
            
            // 5. Render
            this.render()
            
        } catch (error) {
            this.renderError(error)
            throw error
        }
    }

    /**
     * Render all tracks
     */
    render() {
        // Clear existing UI
        this.ui.cleanup()
        
        // Render each track
        for (const viewModel of this.viewModels) {
            const { canvas } = this.ui.createTrackUI(viewModel)
            const ctx = canvas.getContext('2d')
            
            const renderer = RendererRegistry.get(viewModel.type)
            renderer.render(ctx, viewModel, {
                width: canvas.width / (window.devicePixelRatio || 1),
                height: canvas.height / (window.devicePixelRatio || 1)
            })
        }
    }

    /**
     * Change to a new locus and re-render
     */
    async setLocus(locusString) {
        this.config.locus = locusString
        await this.load()
    }

    /**
     * Clean up and remove browser
     */
    destroy() {
        this.ui.cleanup()
        this.viewModels = []
        this.trackConfigs = []
    }

    /**
     * Render error message
     */
    renderError(error) {
        const errorDiv = document.createElement('div')
        errorDiv.style.padding = '20px'
        errorDiv.style.color = 'red'
        errorDiv.style.border = '1px solid red'
        errorDiv.style.borderRadius = '4px'
        errorDiv.style.margin = '10px'
        errorDiv.textContent = `Error: ${error.message}`
        
        this.ui.cleanup()
        this.container.appendChild(errorDiv)
    }
}

