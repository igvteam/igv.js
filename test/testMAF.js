import "./utils/mockObjects.js"
import SegParser from "../js/feature/segParser.js";
import {assert} from 'chai';
import getDataWrapper from "../js/feature/dataWrapper.js";
var fs = require('fs');

suite("testMaf", function () {

    test("parse MAF", async function () {

        const data = fs.readFileSync(require.resolve('./data/mut/tcga_test.maf'));
        const dataWrapper = getDataWrapper(data);
        const parser = new SegParser('maf');
        const features = await parser.parseFeatures(dataWrapper);
        assert.equal(features.length, 17);
    })

})

