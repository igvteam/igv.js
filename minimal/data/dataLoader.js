import { WigSource } from './wigSource.js'
import { FeatureSource } from './featureSource.js'

/**
 * Coordinates data fetching from various sources
 */
export class DataLoader {
    /**
     * Load data for a track in a given region
     */
    async load(trackConfig, region) {
        const source = this.getSource(trackConfig)
        
        try {
            const data = await source.fetch(region)
            return data
        } catch (error) {
            console.error(`Error loading data for track ${trackConfig.name}:`, error)
            return []
        }
    }

    /**
     * Get appropriate data source based on track type
     */
    getSource(config) {
        switch (config.type) {
            case 'wig':
                return new WigSource(config)
            
            case 'refseq':
            case 'gene':
            case 'feature':
                return new FeatureSource(config)
            
            default:
                throw new Error(`Unknown track type: ${config.type}`)
        }
    }
}

