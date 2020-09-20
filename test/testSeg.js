import FeatureSource from "../js/feature/featureSource.js";
import GenomeUtils from "../js/genome/genome.js";
import {assert} from 'chai';
import {createMockObjects} from "@igvteam/test-utils/src"

suite("testRnaStruct", function () {

    createMockObjects();

    const dataURL = "https://data.broadinstitute.org/igvdata/test/data/";

    test("SEG query", async function () {

        const url = dataURL + "seg/segmented_data_080520.seg.gz";
        const featureSource = FeatureSource(
            {format: 'seg', url: url, indexed: false},
            genome);
        const chr = "chr1";
        const bpStart = 0;
        const bpEnd = 747751863;

        const features = await featureSource.getFeatures(chr, bpStart, bpEnd)
        assert.ok(features);
        assert.equal(features.length, 1438);
        // Test 1 feature, insure its on chr1
        const c = genome.getChromosomeName(features[0].chr);
        assert.equal(chr, c);
    })


    test("SEG whole genome", async function () {

        const reference = {
            id: "hg19",
            fastaURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/1kg_v37/human_g1k_v37_decoy.fasta",
            cytobandURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/b37/b37_cytoband.txt"
        };

        const genome = await GenomeUtils.loadGenome(reference)
        const url = dataURL + "seg/segmented_data_080520.seg.gz";
        const featureSource = FeatureSource({format: 'seg', url: url, indexed: false}, genome);
        const chr = "all";
        const features = await featureSource.getFeatures(chr)

        assert.ok(features);
        assert.equal(20076, features.length);
        var c = features[0].realChr;
        assert.equal("1", c);
    })
})

