import igv from '../js/index.js';
import GenomeUtils from '../js/genome/genomeUtils.js';
import Genome from '../js/genome/genome.js';
import search from "../js/search.js"

document.addEventListener('DOMContentLoaded', async () => {

    await GenomeUtils.initializeGenomes({})

    const genomeName = 'hg19'

    const genomeConfig = await GenomeUtils.expandReference(genomeName)

    const genome = await Genome.createGenome(genomeConfig, this)

    const result = await search({ genome }, 'myc')
    console.log(result)

    const canvas = document.querySelector('#dat-gene-render-container canvas');
    renderGenes(canvas);
    
});

function renderGenes(canvas) {
    const ctx = canvas.getContext('2d');
    
    // Get device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    
    // Get the canvas container dimensions
    const rect = canvas.getBoundingClientRect();
    
    // Set canvas size accounting for device pixel ratio
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Scale the context to ensure correct drawing
    ctx.scale(dpr, dpr);
    
    // Paint the canvas red
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, rect.width, rect.height);
}
