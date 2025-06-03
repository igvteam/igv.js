import GenomeUtils from '../js/genome/genomeUtils.js';
import Genome from '../js/genome/genome.js';
import { searchFeatures } from "../js/search.js"
import { createAnnotationRenderService } from './annotationRenderServiceFactory.js'

let annotationRenderService

document.addEventListener('DOMContentLoaded', async () => {

    await GenomeUtils.initializeGenomes({})

    const genomeName = 'hg19'

    const genome = await Genome.createGenome(GenomeUtils.KNOWN_GENOMES[genomeName])

    annotationRenderService = createAnnotationRenderService(document.querySelector('#dat-gene-render-container'), genome)

    const { chr, start:bpStart, end:bpEnd, name } = await searchFeatures({ genome }, 'brca2')

    const features = await annotationRenderService.getFeatures(chr, bpStart, bpEnd)

    annotationRenderService.render({ chr, bpStart, bpEnd, features })
});
