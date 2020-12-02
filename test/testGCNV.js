import "./utils/mockObjects.js"
import FeatureSource from "../js/feature/featureSource.js";
import {assert} from 'chai';
import {genome} from "./utils/Genome.js";
import Browser from "../js/browser.js"

suite("testGCNV", function () {

    test("gcnv", async function () {

        const featureSource = FeatureSource({
            url: require.resolve("./data/gcnv/gcnv_track_example_data.chr22.bed")
        }, genome);

        const trackType = await featureSource.trackType();
        const header = await featureSource.getHeader();

        assert.equal(header.format, "gcnv");
        assert.equal(trackType, "gcnv");
        assert.equal(header.columnNames.length, 172);
        assert.equal(header.highlight.length, 2);

        const features = await featureSource.getFeatures({chr: "chr22", start: 0, end: Number.MAX_SAFE_INTEGER});
        assert.equal(features.length, 10);

    })

    test("long lines", async function () {

        const featureSource = FeatureSource({
            url: require.resolve("./data/gcnv/gcnv_large.bed.gz"),
            indexURL: require.resolve("./data/gcnv/gcnv_large.bed.gz.tbi"),
            format: 'gcnv',
        }, genome);

        await featureSource.getHeader();
        const features = await featureSource.getFeatures({chr: "chr1", start: 925630, end: 926111});
        assert.equal(features.length, 2);

    })

    test("example track", async function () {

        this.timeout(10000);

        const config = {
            name: 'example track',
            url: 'https://s3.amazonaws.com/igv.org.demo/gcnv_track_example_data.chr22.bed.gz',
            indexURL: 'https://s3.amazonaws.com/igv.org.demo/gcnv_track_example_data.chr22.bed.gz.tbi'
        };

        const browser = {genome};

        const track = await Browser.prototype.createTrack.call(browser, config);
        assert.equal(track.type, "gcnv");

        const features = await track.getFeatures("chr22", 23767847, 23843448);
        assert.equal(features.length, 12);

        // verify features were properly decoded
        for(let f of features) {
            const values = f.values;
            assert.ok(Array.isArray(values));
        }
    })

})

