import igv from '../js/index.js';
import GenomeUtils from '../js/genome/genomeUtils.js';
import Genome from '../js/genome/genome.js';
import search from "../js/search.js"
import TextFeatureSource from "../js/feature/textFeatureSource.js"

document.addEventListener('DOMContentLoaded', async () => {

    await GenomeUtils.initializeGenomes({})

    const genomeName = 'hg19'
    const genomeConfig = await GenomeUtils.expandReference(genomeName)
    const genome = await Genome.createGenome(genomeConfig, this)

    const config =
        {
            locus: '19:49301000-49305700',
            genome: "hg19",
            showTrackLabels: false,
            showIdeogram: false,
            showRuler: true,
            showSequence: false,
        };

    const browser = await igv.createBrowser(document.getElementById('dat-gene-render-container'), config, genome)
    console.log(`browser ${browser.guid} is good to go`);


    const featureSourceConfig =
        {
            "id": "refseqSelect",
            "url": "https://hgdownload.soe.ucsc.edu/goldenPath/hg19/database/ncbiRefSeqSelect.txt.gz",
            "format": "refgene",
            "html": "https://www.ncbi.nlm.nih.gov/refseq/refseq_select/",
            "type": "annotation"
        }

    const featureSource = new TextFeatureSource(featureSourceConfig)

    return

    const [{ chr, start, end, name }] = await search({ genome }, 'myc')

    const canvas = document.querySelector('#dat-gene-render-container canvas')
    const { width } = canvas.getBoundingClientRect()
    const bpp = (end - start) / width

    renderGenes(canvas, {})
    console.log(`chr = ${chr}, start = ${start}, end = ${end}, name = ${name} bp/pixel = ${bpp}`)
});

function renderGenes(canvas, config) {

    const ctx = canvas.getContext('2d');

    // Get device pixel ratio
    const dpr = window.devicePixelRatio || 1;

    // Get the canvas container dimensions
    const { width, height } = canvas.getBoundingClientRect();

    // Set canvas size accounting for device pixel ratio
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Paint the canvas red
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, width, height);

}
