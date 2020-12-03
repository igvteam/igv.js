import {assert} from 'chai';
import "./utils/mockObjects.js"
import {genome} from "./utils/Genome.js";
import {loadIndex} from "../js/bam/indexFactory.js"
import FeatureSource from "../js/feature/featureSource.js"
import Browser from "../js/browser.js"

suite("testTribble", function () {

    test("tribble", async function () {
        this.timeout(10000);
        const index = await loadIndex('https://s3.amazonaws.com/igv.org.test/data/gencode.v18.collapsed.bed.idx', {}, genome);
        assert.ok(index);
        // TODO -- add some assertions
    })

    test("vcf indexed", async function () {

        const config = {
            url: "https://s3.amazonaws.com/igv.org.demo/SRP32_v4.sorted.0.vcf",
            indexURL: "https://s3.amazonaws.com/igv.org.demo/SRP32_v4.sorted.0.vcf.idx"
        };

        const browser = {};

        const track = await Browser.prototype.createTrack.call(browser, config);
        assert.equal(track.type, "variant");

        const chr = "2";
        const start = 83811351;
        const end = 83833295;
        const features = await track.getFeatures(chr, start, end);

        assert.equal(features.length, 3);

    })
})




