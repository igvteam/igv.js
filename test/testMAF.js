import "./utils/mockObjects.js"
import SegParser from "../src/igvCore/feature/segParser.js"
import {assert} from 'chai'
import getDataWrapper from "../src/igvCore/feature/dataWrapper.js"
import fs from 'fs'

suite("testMaf", function () {

    test("parse MAF", async function () {

        const data = fs.readFileSync('test/data/mut/tcga_test.maf')
        const dataWrapper = getDataWrapper(data)
        const parser = new SegParser('maf')
        const features = await parser.parseFeatures(dataWrapper)
        assert.equal(features.length, 17)
    })

})

