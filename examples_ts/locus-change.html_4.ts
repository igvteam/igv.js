import type { CreateOpt, TrackLoad, TrackType } from '../js/igv';


$(document).ready(function () {


    var HASH_PREFIX = "#/locus/";
    var currentHash = (window as any).location.hash;
    var locus = (0 === currentHash && currentHash.indexOf(HASH_PREFIX)) ? currentHash.substr(HASH_PREFIX.length) : "chr1:155,160,475-155,184,282";

    var options: CreateOpt = {
        locus: locus,
        genome: "hg19"
    };

    var $igv = $("#igvDiv");
    var browser = igv.createBrowser($igv.get(0), options)

            .then(function (browser) {
                console.log("Created IGV browser");

                browser.on('locuschange', function (referenceFrameList) {
                    let loc = referenceFrameList.map(rf => rf.getLocusString()).join('%20');
                    (window as any).location.replace(HASH_PREFIX + loc);
                });
            });

});
