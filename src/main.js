import GenomeUtils from './igvCore/genome/genomeUtils.js';
import Genome from './igvCore/genome/genome.js';
import { searchFeatures } from "./igvCore/search.js"
import { createAnnotationRenderService } from './annotationRenderServiceFactory.js'
import { knownGenomes } from './knownGenomes.js'

let annotationRenderService

document.addEventListener('DOMContentLoaded', async () => {

    await GenomeUtils.initializeGenomes({})

    const genomeName = 'hg19'

    const genome = await Genome.createGenome(knownGenomes[genomeName])

    annotationRenderService = createAnnotationRenderService(document.querySelector('#dat-gene-render-container'), genome)

    // const { chr, start:bpStart, end:bpEnd, name } = await searchFeatures({ genome }, 'brca2')

    // random locus
    const chr = 'chr16'
    const bpStart = 26716013
    const bpEnd = 29371136

    const features = await annotationRenderService.getFeatures(chr, bpStart, bpEnd)

    annotationRenderService.render({ chr, bpStart, bpEnd, features })
});
