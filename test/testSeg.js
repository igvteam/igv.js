function runSegTests() {

    var dataURL = "https://data.broadinstitute.org/igvdata/test/data/";

    const genome = {
        getChromosomeName: function (chr) {
            return chr.startsWith("chr") ? chr : "chr" + chr;
        }
    }


    asyncTest("SEG query", function () {

        var url = dataURL + "seg/segmented_data_080520.seg.gz",
            featureSource = new igv.FeatureSource(
                {format: 'seg', url: url, indexed: false},
                genome),
            chr = "chr1",
            bpStart = 0,
            bpEnd = 747751863;

        featureSource.getFeatures(chr, bpStart, bpEnd)
            
            .then(function (features) {

            ok(features);

            equal(features.length, 1438);

            // Test 1 feature, insure its on chr1
            var c = genome.getChromosomeName(features[0].chr);

            equal(chr, c);

            start();
        }).catch(function (error) {
            ok(false);
            console.log(error);
        });

    });

    // asyncTest("SEG whole genome", function () {
    //
    //     var url = dataURL + "seg/segmented_data_080520.seg.gz",
    //         featureSource = new igv.FeatureSource({format: 'seg', url: url, indexed: false}),
    //         chr = "all";
    //
    //     var reference = {
    //         id: "hg19",
    //         fastaURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/1kg_v37/human_g1k_v37_decoy.fasta",
    //         cytobandURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/b37/b37_cytoband.txt"
    //     };
    //
    //
    //     igv.loadGenome(reference).then(function (genome) {
    //
    //         featureSource.getFeatures(chr).then(function (features) {
    //
    //             ok(features);
    //
    //             equal(20055, features.length);
    //
    //             // Test 1 feature, insure its on chr1
    //             var c = features[0].chr;
    //             equal("1", c);
    //
    //             start();
    //         }).catch(function (error) {
    //             ok(false);
    //             console.log(error);
    //         });
    //     }).catch(function (error) {
    //         ok(false);
    //         console.log(error);
    //     });
    //
    // });

}
