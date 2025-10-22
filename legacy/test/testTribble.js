import {assert} from 'chai'
import "./utils/mockObjects.js"
import {createGenome} from "./utils/MockGenome.js"


import Browser from "../js/browser.js"

suite("testTribble", function () {

    test("vcf indexed", async function () {

        const config = {
            url: "test/data/vcf/SRP32_v4.sorted.0.vcf",
            indexURL: "test/data/vcf/SRP32_v4.sorted.0.vcf.idx"
        }

        const genome = createGenome()
        const browser = {genome}

        const track = await Browser.prototype.createTrack.call(browser, config)
        assert.equal(track.type, "variant")

        let chr = "chr1"
        let start = 56889705
        let end = 57046955
        let features = await track.getFeatures(chr, start, end)
        assert.equal(features.length, 3)

         chr = "chr2"
         start = 83811351
         end = 83833295
         features = await track.getFeatures(chr, start, end)
        assert.equal(features.length, 3)

    })


    test("vcf indexed with chr alias", async function () {

        const config = {
            url: "test/data/vcf/SRP32_v4.sorted.0.vcf",
            indexURL: "test/data/vcf/SRP32_v4.sorted.0.vcf.idx"
        }

        const genome = createGenome("ncbi")
        const browser = {genome}

        const track = await Browser.prototype.createTrack.call(browser, config)
        assert.equal(track.type, "variant")

        let chr = "1"
        let start = 56889705
        let end = 57046955
        let features = await track.getFeatures(chr, start, end)
        assert.equal(features.length, 3)

        chr = "2"
        start = 83811351
        end = 83833295
        features = await track.getFeatures(chr, start, end)
        assert.equal(features.length, 3)

    })
})




