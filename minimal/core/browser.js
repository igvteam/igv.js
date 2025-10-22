import { GenomicRegion } from '../models/genomicRegion.js'
import { TrackConfig } from '../models/track.js'
import { DataLoader } from '../data/dataLoader.js'
import { ViewModelBuilder } from '../viewmodel/viewModelBuilder.js'
import { UIManager } from '../ui/uiManager.js'
import { RendererRegistry } from '../render/rendererRegistry.js'
import { GenomeResolver } from '../genome/genomeResolver.js'
import { ChromosomeInfo } from '../genome/chromosomeInfo.js'
import { GenomeConfig } from '../models/genome.js'
import { search } from '../genome/search.js'
import { loadSequence } from '../genome/loadSequence.js'
import { getCanvasDimensions } from '../ui/canvas.js'

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
        this.dataLoader = new DataLoader(this) // Pass browser instance
        this.viewModels = []
        this.trackConfigs = []
        this.genome = null
        this.chromosomeInfo = null
        this.resizeObserver = null
        this.resizeDebounceTimer = null
        this.onResizeComplete = config.onResizeComplete || null
        this.lastRenderedWidth = null
    }

    /**
     * Load and render all tracks for the configured locus
     */
    async load() {
        try {
            // 1. Resolve genome (if provided)
            if (this.config.genome) {
                console.log('Browser: Resolving genome:', this.config.genome)
                const genomeData = await GenomeResolver.resolve(this.config.genome)
                const genomeConfig = new GenomeConfig(genomeData)
                
                // Load sequence (pass null for browser to avoid cache management issues)
                console.log('Browser: Loading sequence from', genomeConfig.sequenceSource)
                const sequenceLoader = await loadSequence(genomeData, null)
                console.log('Browser: Sequence loaded')
                
                // Store both the config and sequence loader
                this.genomeConfig = genomeConfig
                this.sequenceLoader = sequenceLoader
                
                // Create a genome object that provides access to both
                this.genome = genomeConfig
                
                this.chromosomeInfo = await ChromosomeInfo.load(genomeConfig.chromSizesURL)
                console.log('Browser: Loaded genome:', genomeConfig.name, 'with', this.chromosomeInfo.chromosomes.length, 'chromosomes')

                // Add ruler track (always first)
                const rulerTrack = {
                    type: 'ruler',
                    name: '',
                    order: Number.MIN_SAFE_INTEGER,
                    height: 40
                }
                this.config.tracks = [rulerTrack, ...this.config.tracks]

                // Optionally add default tracks
                if (this.config.includeDefaultTracks) {
                    console.log('Browser: Getting default tracks...')
                    const defaultTracks = this.genome.getDefaultTracks(this.config)
                    console.log('Browser: Default tracks:', defaultTracks)

                    // Add default tracks with proper configuration
                    const configuredDefaultTracks = defaultTracks.map(track => ({
                        ...track,
                        height: track.height || 50,
                        color: track.color || '#666666'
                    }))

                    this.config.tracks = [...this.config.tracks, ...configuredDefaultTracks]
                    console.log('Browser: Added', configuredDefaultTracks.length, 'default tracks')
                }
            }

            // 2. Parse locus into genomic region (supports both coordinates and gene names)
            this.region = await search(this, this.config.locus)

            // 3. Create track configurations
            if (!this.config.tracks || this.config.tracks.length === 0) {
                throw new Error('No tracks configured')
            }

            this.trackConfigs = this.config.tracks.map(t => new TrackConfig(t))

            // 4. Calculate pixel width for bpPerPixel calculation
            const availableWidth = this.ui.getAvailableWidth()
            const bpPerPixel = this.region.length / availableWidth
            console.log(`Browser: Region size = ${this.region.length} bp, Width = ${availableWidth} px, bpPerPixel = ${bpPerPixel.toFixed(2)}`)

            // 5. Fetch all track data in parallel with correct bpPerPixel
            const dataPromises = this.trackConfigs.map(config =>
                this.dataLoader.load(config, this.region, bpPerPixel)
            )

            const trackData = await Promise.all(dataPromises)

            // 6. Build view models
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

            // 7. Render
            this.render()

            // 8. Set up resize observer
            this.setupResizeObserver()

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

        // Store the width we're rendering at
        this.lastRenderedWidth = this.ui.getAvailableWidth()

        // Render each track
        for (const viewModel of this.viewModels) {
            const { canvas } = this.ui.createTrackUI(viewModel)
            const ctx = canvas.getContext('2d')

            // Get CSS pixel dimensions (handles HiDPI scaling)
            const dimensions = getCanvasDimensions(canvas)

            const renderer = RendererRegistry.get(viewModel.type)
            renderer.render(ctx, viewModel, dimensions)
        }
    }

    /**
     * Change to a new locus and re-render
     */
    async setLocus(locusString) {
        try {
            // Update locus in config
            this.config.locus = locusString

            // 1. Parse new locus into genomic region (supports both coordinates and gene names)
            this.region = await search(this, this.config.locus)

            // 2. Calculate pixel width for bpPerPixel calculation
            const availableWidth = this.ui.getAvailableWidth()
            const bpPerPixel = this.region.length / availableWidth
            console.log(`Browser: New region size = ${this.region.length} bp, Width = ${availableWidth} px, bpPerPixel = ${bpPerPixel.toFixed(2)}`)

            // 3. Fetch all track data in parallel with correct bpPerPixel
            const dataPromises = this.trackConfigs.map(config =>
                this.dataLoader.load(config, this.region, bpPerPixel)
            )

            const trackData = await Promise.all(dataPromises)

            // 4. Build view models
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

            // 5. Re-render
            this.render()

        } catch (error) {
            this.renderError(error)
            throw error
        }
    }

    /**
     * Set up ResizeObserver to handle container size changes
     */
    setupResizeObserver() {
        // Clean up existing observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect()
        }

        this.resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                this.handleResize(entry.contentRect.width)
            }
        })

        this.resizeObserver.observe(this.container)
    }

    /**
     * Handle resize events with debouncing
     */
    handleResize(newWidth) {
        // Debounce: wait 150ms after resize stops
        clearTimeout(this.resizeDebounceTimer)
        this.resizeDebounceTimer = setTimeout(() => {
            this.onResize(newWidth)
        }, 150)
    }

    /**
     * Process resize after debounce period
     */
    async onResize(newWidth) {
        console.log(`Browser: Resize to ${newWidth}px (last: ${this.lastRenderedWidth}px)`)
        
        // Don't re-render if width hasn't meaningfully changed from last render
        if (this.lastRenderedWidth && Math.abs(newWidth - this.lastRenderedWidth) < 5) {
            console.log('Browser: Width change too small, skipping resize')
            return
        }
        
        // Maintain current locus and re-render at new width
        await this.refreshAtCurrentLocus()

        // Notify listener
        if (this.onResizeComplete) {
            this.onResizeComplete({
                width: newWidth,
                region: this.region,
                bpPerPixel: this.region.length / newWidth
            })
        }
    }

    /**
     * Refresh the view at the current locus with new dimensions
     */
    async refreshAtCurrentLocus() {
        try {
            if (!this.region) {
                console.warn('Browser: No region set, cannot refresh')
                return
            }

            console.log(`Browser: Refreshing at current locus ${this.region.chr}:${this.region.start}-${this.region.end}`)

            // 1. Calculate new pixel width
            const availableWidth = this.ui.getAvailableWidth()
            const bpPerPixel = this.region.length / availableWidth
            console.log(`Browser: New width = ${availableWidth} px, bpPerPixel = ${bpPerPixel.toFixed(2)}`)

            // 2. Re-fetch all track data at new resolution
            const dataPromises = this.trackConfigs.map(config =>
                this.dataLoader.load(config, this.region, bpPerPixel)
            )

            const trackData = await Promise.all(dataPromises)

            // 3. Rebuild view models with new dimensions
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

            // 4. Re-render
            this.render()

        } catch (error) {
            console.error('Browser: Error during resize refresh:', error)
        }
    }

    /**
     * Clean up and remove browser
     */
    destroy() {
        // Disconnect resize observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect()
            this.resizeObserver = null
        }

        // Clear any pending resize timers
        if (this.resizeDebounceTimer) {
            clearTimeout(this.resizeDebounceTimer)
            this.resizeDebounceTimer = null
        }

        // Clean up UI
        this.ui.cleanup()
        this.viewModels = []
        this.trackConfigs = []
        this.genome = null
        this.chromosomeInfo = null
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

