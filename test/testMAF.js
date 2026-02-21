import SegParser from "../js/feature/segParser.js"
import {assert} from './utils/assert.js'
import getDataWrapper from "../js/feature/dataWrapper.js"
import fs from 'fs'

describe("testMaf", function () {

    it("parse MAF", async function () {

        const data = fs.readFileSync('test/data/mut/tcga_test.maf')
        const dataWrapper = getDataWrapper(data)
        const parser = new SegParser('maf')
        const features = await parser.parseFeatures(dataWrapper)
        assert.equal(features.length, 17)
    })

})

