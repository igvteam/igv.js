var igvdev = {

    createTrackList:  function (div, file, browser) {


        return igv.xhr.loadJson(file)

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

                            browser.loadTrack(json);
                        });

                        div.appendChild(trackDiv);
                    }

                })

                return igv.GtexUtils.getTissueInfo("gtex_v7")
            })

            .then(function (json) {

                div.insertAdjacentHTML("beforeend",
                    "<div style='cursor:default;background:lightgrey;color:black;margin-left:0; font-weight:bold;font-size: larger'>GTEX</div>");

                json[ 'tissueSummary' ].forEach(function (obj) {

                    let trackDiv = document.createElement('div');
                    trackDiv.innerHTML = (obj.tissueSiteDetailId.split('_').join(' '));
                    trackDiv.addEventListener('click', function (event) {

                        browser.loadTrack(igv.GtexUtils.trackConfiguration(obj));

                    });

                    div.appendChild(trackDiv)

                })
            });

    }
}