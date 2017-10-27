function runTabixTests() {

    var dataURL = "https://data.broadinstitute.org/igvdata/test/data/"


    asyncTest("blocksForRange", function () {

        var refID = 14,
            beg = 24375199,
            end = 24378544,
            indexPath = dataURL + "tabix/TSVC.vcf.gz.tbi",
            config = {};

        igv.loadBamIndex(indexPath, config, true).then(function (bamIndex) {

            ok(bamIndex);
            start();
        }).catch(function (error) {
            ok(false);
            console.log(error);
            start();
        });

    });


    asyncTest("Washu query", function () {
        var config = {
            format: 'bed',
            indexed: true,
            url: 'http://vizhub.wustl.edu/hubSample/hg19/GSM429321.gz',
            indexURL: 'http://vizhub.wustl.edu/hubSample/hg19/GSM429321.gz.tbi'
        }

        var tb = new igv.FeatureFileReader(config);
        tb.readHeader()
            .then(function (header) {

                const start = 26733030;
                const end = 27694134;
                const chr = 'chr7';
                tb.readFeatures(chr, start, end)
                        .then(function (features) {
                            ok(features.length > 0);
                            features.forEach(function (f) {
                                if(chr !== f.chr && !(f.start <= end && f.end >= start)) {
                                    ok(false);
                                }
                            })
                            start();
                        })
                        .catch(function (error) {
                            console.log(Error('query tabix error: ') + error);
                            console.log(error.stack);
                        });
                }
            )
            .catch(function (error) {
                console.log(Error('load tabix index error: ') + error);
                start();
            });
    });


}



