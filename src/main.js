import igv from '../js/index.js';

document.addEventListener('DOMContentLoaded', async () => {
    const config = {
        locus: '19:49301000-49305700',
        genome: "hg19",
        showTrackLabels: false,
        showIdeogram: false,
        showRuler: true,
        showSequence: false,
    };

    const browser = await igv.createBrowser(document.getElementById('igv-container'), config);
    console.log(`browser ${browser.guid} is good to go`);
}); 