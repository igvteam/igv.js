import type { CreateOpt, TrackLoad, TrackType } from '../js/igv';
import igv from "../js/igv";


var options: CreateOpt = {
    genome: "hg19",
    locus: "chr1:155,138,124-155,153,715",
    tracks:
        [
            {
                url: 'https://www.encodeproject.org/files/ENCFF000ASF/@@download/ENCFF000ASF.bigWig',
                name: 'Red',
                color: 'rgb(200,0,0)',
                autoscaleGroup: '1'
            },
            {
                url: 'https://www.encodeproject.org/files/ENCFF000ASJ/@@download/ENCFF000ASJ.bigWig',
                name: 'Blue',
                color: 'rgb(0,0,150)',
                autoscaleGroup: '1'
            },
            {
                url: 'https://www.encodeproject.org/files/ENCFF000ATA/@@download/ENCFF000ATA.bigWig',
                name: 'Green',
                color: 'rgb(0,150,0)',
                autoscaleGroup: '1'
            }
        ]
}

const igv_custom_track_click = $('#igv-custom-track-click')

igv.createBrowser(igv_custom_track_click.get(0), options)

    .then(function (browser) {

        // Initialize list, this is not part of the public API
        updateTrackList(browser.getTrackOrder())

        browser.on('trackorderchanged', updateTrackList);

        function updateTrackList(trackNames) {
            let html = "<ul>";
            for (let track of trackNames) {
                html += `<li>${track}</li>`
            }
            html += "</ul>";
            (document.getElementById("trackList") as HTMLElement).innerHTML = html;
        }
    })
