import "./utils/mockObjects.js"
import {assert} from 'chai';
import {fileToDataURL} from "./utils/URLUtils";
import HICDataset from "../js/hic/hicDataset.js"
import ContactProjectionDatasource from "../js/hic/contactProjectionDatasource.js"

suite("test HiC", function () {

    test("metadata", async function () {
        this.timeout(100000);
        const dataset = new HICDataset({
            "url": "https://s3.amazonaws.com/igv.org.test/data/hic/intra_nofrag_30.hic",
            "nvi": "863389571,18679"
        })

        await dataset.init()
        assert.ok(dataset.metaData)
    });

    test("datasource", async function () {
        this.timeout(100000);
        const datasource = new ContactProjectionDatasource({
            "url": "https://s3.amazonaws.com/igv.org.test/data/hic/intra_nofrag_30.hic",
            "nvi": "863389571,18679"
        })

        const region = {chr: "8", start: 48700000, end: 48900000}
        const features = await datasource.getFeatures(region)
        assert.ok(features.length > 0)
    });

})

