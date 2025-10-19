import { WigViewModel } from './wigViewModel.js'
import { GeneViewModel } from './geneViewModel.js'
import { SequenceViewModel } from './sequenceViewModel.js'

/**
 * Factory for building view models from track configuration and data
 */
export class ViewModelBuilder {
    /**
     * Build appropriate view model based on track type
     */
    static build(trackConfig, data, region, dimensions) {
        switch (trackConfig.type) {
            case 'wig':
                return new WigViewModel(trackConfig, data, region, dimensions)
            
            case 'sequence':
                return new SequenceViewModel(trackConfig, data, region, dimensions)
            
            case 'refseq':
            case 'gene':
            case 'feature':
                return new GeneViewModel(trackConfig, data, region, dimensions)
            
            default:
                throw new Error(`Unknown track type: ${trackConfig.type}`)
        }
    }
}

