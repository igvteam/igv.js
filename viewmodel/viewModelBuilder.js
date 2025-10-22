import { WigViewModel } from './wigViewModel.js'
import { GeneViewModel } from './geneViewModel.js'
import { SequenceViewModel } from './sequenceViewModel.js'
import { IdeogramViewModel } from './ideogramViewModel.js'
import { RulerViewModel } from './rulerViewModel.js'

/**
 * Factory for building view models from track configuration and data
 */
export class ViewModelBuilder {
    /**
     * Build appropriate view model based on track type
     */
    static build(trackConfig, data, region, dimensions) {
        switch (trackConfig.type) {
            case 'ruler':
                return new RulerViewModel(trackConfig, data, region, dimensions)
            
            case 'ideogram':
                return new IdeogramViewModel(trackConfig, data, region, dimensions)
            
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

