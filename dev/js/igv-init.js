import GtexUtils from "../../js/gtex/gtexUtils";
import igvxhr from "../../js/igvxhr";

let browser;


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