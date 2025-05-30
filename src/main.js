import GenomeUtils from '../js/genome/genomeUtils.js';
import Genome from '../js/genome/genome.js';
import search from "../js/search.js"

document.addEventListener('DOMContentLoaded', async () => {

    await GenomeUtils.initializeGenomes({})

    const genomeName = 'hg19'

    const genomeConfig = await GenomeUtils.expandReference(genomeName)

    const genome = await Genome.createGenome(genomeConfig, this)

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
