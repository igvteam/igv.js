import GenomeUtils from '../js/genome/genomeUtils.js';
import Genome from '../js/genome/genome.js';
import { searchFeatures } from "../js/search.js"
import { createAnnotationRenderService } from './annotationRenderServiceFactory.js'

let annotationRenderService

document.addEventListener('DOMContentLoaded', async () => {

    await GenomeUtils.initializeGenomes({})

    const genomeName = 'hg19'
    const genomeConfig = GenomeUtils.KNOWN_GENOMES[genomeName]
    const genome = await Genome.createGenome(genomeConfig, this)

    annotationRenderService = createAnnotationRenderService(document.querySelector('#dat-gene-render-container'), genome)

    let { chr, start, end, name } = await searchFeatures({ genome }, 'brca2')

    const features = await annotationRenderService.getFeatures(chr, start, end)

    const renderConfig =
        {
            chr,
            features,
            bpStart: start,
            bpEnd: end
        };

    annotationRenderService.render(renderConfig)
});
