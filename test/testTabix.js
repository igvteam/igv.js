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
        });

    });


    asyncTest("Washu query", function () {
        var config = {
            format: 'bed',
            indexed: true,
            url: 'http://vizhub.wustl.edu/hubSample/hg19/GSM429321.gz',
            indexURL: 'http://vizhub.wustl.edu/hubSample/hg19/GSM429321.gz.tbi'
        }

        var tb = new igv.FeatureSource(config);
        tb.getFileHeader()
            .then(function (header) {
                    ok(header);
                    tb.getFeatures('chr7', 0, 40694134)
                        .then(function (features) {
                            ok(features);
                        })
                        .catch(function (error) {
                            console.log(Error('query tabix error: ') + error);
                            console.log(error.stack);
                        });
                }
            )
            .catch(function (error) {
                console.log(Error('load tabix index error: ') + error);
            });
    });


}



