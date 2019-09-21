import {createBrowser} from "../../js/igv-create";
import GtexUtils from "../../js/gtex/gtexUtils";
import google from "../../js/google/googleUtils";
import igvxhr from "../../js/igvxhr";

let browser;
google.loadGoogleProperties("https://s3.amazonaws.com/igv.org.app/web_client_google")

    .then( function (google) {

        const options =
            {
                genome: "hg19",
                //  locus: [ 'egfr', 'myc' ],
                locus: "myc",
                flanking: 1000,
                queryParametersSupported: true,
                showAllChromosomes: true
            };

        createBrowser(document.getElementById('igvDiv'), options)
            .then(async function (b) {
                browser = b;
                await createTrackList(document.getElementById('trackList'), '../test/testTracks.json', browser);
                return browser;
            });

    });


function createTrackList(div, file, browser) {


    return igvxhr.loadJson(file)

        .then(function (tracks) {

            tracks.forEach(function (track) {

                var trackDiv, name;

                if (track.HEADING) {
                    div.insertAdjacentHTML("beforeend",
                        "<div style='cursor:default;background:lightgrey;color:black;margin-left:0; font-weight:bold;font-size: larger'>"
                        + track.HEADING + "</div>");
                } else {
                    trackDiv = document.createElement('div');
                    trackDiv.innerHTML = track.name;
                    trackDiv.addEventListener('click', function (event) {

                        // Convert to json to insure we can load json representations (not strictly neccessary).
                        var json = JSON.stringify(track);

                        browser.loadTrack(json);
                    });

                    div.appendChild(trackDiv);
                }

            })

            return GtexUtils.getTissueInfo("gtex_v7")
        })

        .then(function (json) {

            div.insertAdjacentHTML("beforeend",
                "<div style='cursor:default;background:lightgrey;color:black;margin-left:0; font-weight:bold;font-size: larger'>GTEX</div>");

            json['tissueInfo'].forEach(function (obj) {

                let trackDiv = document.createElement('div');
                trackDiv.innerHTML = (obj.tissueSiteDetailId.split('_').join(' '));
                trackDiv.addEventListener('click', function (event) {

                    browser.loadTrack(GtexUtils.trackConfiguration(obj));

                });

                div.appendChild(trackDiv)

            })
        });

}

function bookmark() {
    window.history.pushState({}, "IGV", browser.sessionURL());
}