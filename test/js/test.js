var igvtest = {

    createTrackList:  function (div) {


        return igv.xhr.loadJson("../test/testTracks.json")

            .then(function (tracks) {

                tracks.forEach(function (track) {

                    var trackDiv, name;

                    if (track.HEADING) {
                        div.insertAdjacentHTML("beforeend",
                            "<div style='cursor:default;background:lightgrey;color:black;margin-left:0; font-weight:bold;font-size: larger'>"
                            + track.HEADING + "</div>");
                    }
                    else {
                        trackDiv = document.createElement('div');
                        trackDiv.innerHTML = track.name;
                        trackDiv.addEventListener('click', function (event) {

                            // Convert to json to insure we can load json representations (not strictly neccessary).
                            var json = JSON.stringify(track);

                            igv.browser.loadTrack(json);
                        });

                        div.appendChild(trackDiv);
                    }

                })

                return igv.GtexUtils.getTissueInfo("gtex_v7")
            })

            .then(function (json) {

                let tissueSummary = json['tissueSummary'];

                div.insertAdjacentHTML("beforeend",
                    "<div style='cursor:default;background:lightgrey;color:black;margin-left:0; font-weight:bold;font-size: larger'>GTEX</div>");

                tissueSummary.forEach((ts) => {

                    let trackDiv = document.createElement('div');

                    trackDiv.innerHTML = (ts['tissueSiteDetailId'].split('_').join(' '));
                    trackDiv.addEventListener('click', function (event) {
                        igv.browser.loadTrack(igv.GtexUtils.trackConfiguration(ts));
                    });

                    div.appendChild(trackDiv)

                })
            });

    }
};