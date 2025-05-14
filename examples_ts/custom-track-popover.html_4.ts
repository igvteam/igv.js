import type { CreateOpt, TrackLoad, TrackType } from '../js/igv';


$(document).ready(function () {

    var options: CreateOpt =
    {
        showNavigation: true,
        locus: "chr1:155,160,475-155,184,282",
        genome: "hg19",
    };

    var igv_custom_track_popover = $('#igv-custom-track-popover');

    igv.createBrowser(igv_custom_track_popover.get(0), options)

            .then(function (browser) {
                browser.on('trackclick', function (track, popoverData) {

                    var markup = '<table class="styled-table">';

                    // Don't show a pop-over when there's no data.
                    if (!popoverData || !popoverData.length) {
                        return false;
                    }

                    popoverData.forEach(function (nameValue) {

                        if (nameValue.name) {

                            var value = nameValue.name.toLowerCase() === 'name'
                                    ? '<a href="https://uswest.ensembl.org/Multi/Search/Results?q=' + nameValue.value + '">' + nameValue.value + '</a>'
                                    : nameValue.value;

                            markup += "<tr><td>" + nameValue.name + "</td><td>" + value + "</td></tr>";
                        }
                        else {
                            // not a name/value pair
                            markup += "<tr><td>" + nameValue.toString() + "</td></tr>";
                        }
                    });

                    markup += "</table>";

                    // By returning a string from the trackclick handler we're asking IGV to use our custom HTML in its pop-over.
                    return markup;
                });
            });

});
