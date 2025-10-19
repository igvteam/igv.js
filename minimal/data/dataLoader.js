import { WigSource } from './wigSource.js'
import { BigWigSource } from './bigwigSource.js'
import { FeatureSource } from './featureSource.js'
import { SequenceSource } from './sequenceSource.js'
import { RefSeqSource } from './refseqSource.js'

/**
 * Coordinates data fetching from various sources
 */
export class DataLoader {
    /**
     * Load data for a track in a given region
     * @param trackConfig - Track configuration
     * @param region - Genomic region
     * @param bpPerPixel - Basepairs per pixel (for BigWig resolution)
     */
    async load(trackConfig, region, bpPerPixel) {
        console.log('DataLoader.load() called with bpPerPixel:', bpPerPixel)
        console.log('DataLoader.load() trackConfig:', trackConfig)
        const source = this.getSource(trackConfig)
        
        try {
            console.log('DataLoader: Calling source.fetch() with bpPerPixel:', bpPerPixel)
            const data = await source.fetch(region, bpPerPixel)
            return data
        } catch (error) {
            console.error(`Error loading data for track ${trackConfig.name}:`, error)
            return []
        }
    }

    /**
     * Get appropriate data source based on track type and format
     */
    getSource(config) {
        // Infer type from format if type is not specified
        let type = config.type
        if (!type && config.format) {
            const format = config.format.toLowerCase()
            if (format === 'refgene') {
                type = 'refseq'
            } else if (format === 'bigwig' || format === 'wig') {
                type = 'wig'
            } else if (format === 'bed' || format === 'gff' || format === 'gtf') {
                type = 'feature'
            }
        }
        
        switch (type) {
            case 'wig':
                // Check if this is a BigWig file (binary format)
                const url = config.url.toLowerCase()
                const format = config.format ? config.format.toLowerCase() : ''
                
                if (format === 'bigwig' || url.endsWith('.bw') || url.endsWith('.bigwig')) {
                    console.log('DataLoader: Using BigWigSource for', config.url)
                    return new BigWigSource(config)
                } else {
                    // Text-based WIG or bedgraph
                    console.log('DataLoader: Using WigSource for', config.url)
                    return new WigSource(config)
                }
            
            case 'sequence':
                console.log('DataLoader: Using SequenceSource for', config.url || 'genome sequence')
                return new SequenceSource(config)
            
            case 'refseq':
                console.log('DataLoader: Using RefSeqSource for', config.url)
                return new RefSeqSource(config)
            
            case 'gene':
            case 'feature':
                console.log('DataLoader: Using FeatureSource for', config.url)
                return new FeatureSource(config)
            
            default:
                throw new Error(`Unknown track type: ${config.type || 'undefined'} (format: ${config.format || 'undefined'})`)
        }
    }
}

