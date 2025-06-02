import GenomeUtils from '../js/genome/genomeUtils.js';
import Genome from '../js/genome/genome.js';
import search from "../js/search.js"
import TextFeatureSource from "../js/feature/textFeatureSource.js"
import QTLSelections from "../js/qtl/qtlSelections.js"
import ReferenceFrame from "../js/referenceFrame.js"
import FeatureRenderer from "../js/feature/featureRenderer.js"
import AnnotationRenderService from './annotationRenderService.js'

let annotationRenderService

document.addEventListener('DOMContentLoaded', async () => {

    await GenomeUtils.initializeGenomes({})

    const genomeName = 'hg19'
    const genomeConfig = GenomeUtils.KNOWN_GENOMES[genomeName]
    const genome = await Genome.createGenome(genomeConfig, this)

    const featureSourceConfig =
        {
            "id": "refseqSelect",
            "url": "https://hgdownload.soe.ucsc.edu/goldenPath/hg19/database/ncbiRefSeqSelect.txt.gz",
            "format": "refgene",
            "html": "https://www.ncbi.nlm.nih.gov/refseq/refseq_select/",
            "type": "annotation"
        }

    const featureSource = new TextFeatureSource(featureSourceConfig)

    const [{ chr, start, end, name }] = await search({ genome }, 'egfr')
    const features = await featureSource.getFeatures({chr, start, end})

    const container = document.querySelector('#dat-gene-render-container')
    const { width, height } = container.getBoundingClientRect()
    const bpp = (end - start) / width

    console.log(`chr = ${chr}, start = ${start}, end = ${end}, name = ${name} bp/pixel = ${bpp}`)

    const browser =
        {
            genome,
            qtlSelections: new QTLSelections()
        };

    const featureRendererConfig =
        {
            "format": "refgene",
            "type": "annotation",
            browser
        };

    const featureRenderer = new FeatureRenderer(featureRendererConfig)
    annotationRenderService = new AnnotationRenderService(container, featureRenderer)

    const canvas = document.querySelector('#dat-gene-render-container canvas')

    const drawConfig =
        {
            chr,
            features,
            bpStart: start,
            bpEnd: end,
            
            context: canvas.getContext('2d'),
            bpPerPixel: bpp,
            pixelHeight: height,
            pixelWidth: width,
            viewportWidth: width,
        };

    annotationRenderService.render(drawConfig)
});
