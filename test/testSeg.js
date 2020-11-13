import "./utils/mockObjects.js"
import FeatureSource from "../js/feature/featureSource.js";
import GenomeUtils from "../js/genome/genome.js";
import {assert} from 'chai';
import {genome} from "./utils/Genome.js";

suite("testSeg", function () {

    const dataURL = "https://data.broadinstitute.org/igvdata/test/data/";

    test("SEG query", async function () {

        this.timeout(100000);

        const url = dataURL + "seg/segmented_data_080520.seg.gz";
        const featureSource = FeatureSource(
            {format: 'seg', url: url, indexed: false},
            genome);
        const chr = "chr1";
        const start = 0;
        const end = 747751863;

        const features = await featureSource.getFeatures({chr, start, end})
        assert.ok(features);
        assert.equal(features.length, 1438);
        // Test 1 feature, insure its on chr1
        const c = genome.getChromosomeName(features[0].chr);
        assert.equal(chr, c);
    })


    test("SEG whole genome", async function () {

        this.timeout(100000);

        const reference = {
            id: "hg19",
            fastaURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/1kg_v37/human_g1k_v37_decoy.fasta",
            cytobandURL: "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/b37/b37_cytoband.txt"
        };

        const genome = await GenomeUtils.loadGenome(reference)
        const url = dataURL + "seg/segmented_data_080520.seg.gz";
        const featureSource = FeatureSource({format: 'seg', url: url, indexed: false}, genome);
        const chr = "all";
        const features = await featureSource.getFeatures({chr})

        assert.ok(features);
        assert.equal(20076, features.length);
        var c = features[0]._f.chr;
        assert.equal("1", c);
    })
})

