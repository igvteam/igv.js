import GenomeUtils from '../js/genome/genomeUtils.js';
import Genome from '../js/genome/genome.js';
import search from "../js/search.js"
import TextFeatureSource from "../js/feature/textFeatureSource.js"
import QTLSelections from "../js/qtl/qtlSelections.js"
import featureRenderer from "../js/feature/featureRenderer.js"
import ReferenceFrame from "../js/referenceFrame.js"
import FeatureRenderer from "../js/feature/featureRenderer.js"

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

    const [{ chr, start, end, name }] = await search({ genome }, 'myc')
    const features = featureSource.getAllFeatures(chr, start, end)

    const canvas = document.querySelector('#dat-gene-render-container canvas')
    const { width, height } = canvas.getBoundingClientRect()
    const bpp = (end - start) / width

    console.log(`chr = ${chr}, start = ${start}, end = ${end}, name = ${name} bp/pixel = ${bpp}`)

    const referenceFrame = new ReferenceFrame(genome, chr, start, end, bpp)

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

    const drawConfig =
        {
            context: canvas.getContext('2d'),
            bpPerPixel: bpp,
            bpStart: start,
            bpEnd: end,
            pixelHeight: height,
            pixelWidth: width,
            viewportWidth: width,
            referenceFrame,
            features
        };

    renderGenes(featureRenderer, drawConfig)
});

function renderGenes(featureRenderer, drawConfig) {

    // Get device pixel ratio
    const dpr = window.devicePixelRatio || 1;

    const canvas = drawConfig.context.canvas
    // Get the canvas container dimensions
    const { width, height } = canvas.getBoundingClientRect();

    // Set canvas size accounting for device pixel ratio
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    drawConfig.context.scale(dpr, dpr);

    // Paint the canvas red
    drawConfig.context.fillStyle = 'white';
    drawConfig.context.fillRect(0, 0, width, height);

    featureRenderer.draw(drawConfig)

}
