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

                tissueSummary.forEach(function (obj) {

                    let trackDiv = document.createElement('div');
                    trackDiv.innerHTML = (obj['tissueSiteDetailId'].split('_').join(' '));
                    trackDiv.addEventListener('click', function (event) {

                        let gtexTrack =
                            {
                                "type": "eqtl",
                                "sourceType": "gtex-ws",
                                "url": "https://gtexportal.org/rest/v1/association/singleTissueEqtlByLocationDev",
                                "tissueName": obj.tissueSiteDetailId,
                                "name": obj.tissueSiteDetailId,
                                "visibilityWindow": 1000000
                            };

                        igv.browser.loadTrack(gtexTrack);

                    });

                    div.appendChild(trackDiv)

                })
            });

    }
}