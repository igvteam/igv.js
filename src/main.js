import igv from '../js/index.js';
import GenomeUtils from '../js/genome/genomeUtils.js';
import Genome from '../js/genome/genome.js';
import search from "../js/search.js"

document.addEventListener('DOMContentLoaded', async () => {

    const config =
        {
            locus: '19:49301000-49305700',
            genome: "hg19",
            showTrackLabels: false,
            showIdeogram: false,
            showRuler: true,
            showSequence: false,
        };

    if (!GenomeUtils.KNOWN_GENOMES) {
        await GenomeUtils.initializeGenomes(config)
    }

    const genomeConfig = await GenomeUtils.expandReference(config.genome)

    const genome = await Genome.createGenome(genomeConfig, this)

    const result = await search({ genome }, config.locus)
    // const result = await search({ genome }, 'myc')
    console.log(result)

    const browser = await igv.createBrowser(document.getElementById('igv-container'), config, genome)

    console.log(`browser ${browser.guid} is good to go`);
});
