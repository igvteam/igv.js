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
import { loadSequence } from '../../js/genome/loadSequence.js'

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

                    this.config.tracks = [...configuredDefaultTracks, ...this.config.tracks]
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
     * Clean up and remove browser
     */
    destroy() {
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

