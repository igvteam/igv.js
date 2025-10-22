/**
 * BigWig data source for the minimal IGV core
 */
import BWReader from '../bigwig/bwReader.js'

export class BigWigSource {
    constructor(config) {
        this.url = config.url
        this.config = config
        this.reader = new BWReader(config, null) // No genome object needed for minimal core
    }

    async fetch(region, bpPerPixel) {
        try {
            console.log('BigWigSource: Fetching data for region:', region, 'bpPerPixel:', bpPerPixel)

            // Load header if not already loaded
            // console.log('BigWigSource: Loading header...')
            await this.reader.loadHeader()
            console.log('BigWigSource: Header loaded, type:', this.reader.type)

            // Read features for the specified region
            // Use the calculated bpPerPixel to get the appropriate resolution
            // If not provided, default to 1 (full resolution - not recommended for large regions)
            const effectiveBpPerPixel = bpPerPixel || 1
            const windowFunction = this.config.windowFunction || 'mean'

            console.log('BigWigSource: Reading features with bpPerPixel:', effectiveBpPerPixel, 'windowFunction:', windowFunction)

            const features = await this.reader.readFeatures(
                region.chr,
                region.start,
                region.chr,
                region.end,
                effectiveBpPerPixel,
                windowFunction
            )

            console.log('BigWigSource: Read', features.length, 'features')
            if (features.length > 0) {
                console.log('BigWigSource: Sample feature:', features[0])
            }

            // Convert BigWig features to our standard format: {chr, start, end, value}
            const converted = features.map(f => ({
                chr: f.chr || region.chr,
                start: f.start,
                end: f.end,
                value: f.value || f.score
            }))

            console.log('BigWigSource: Returning', converted.length, 'converted features')
            return converted

        } catch (error) {
            console.error('Error fetching BigWig data:', error)
            throw error
        }
    }
}

