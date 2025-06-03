import "./utils/mockObjects.js"
import loadPlinkFile from "../src/igvCore/sample/plinkSampleInformation.js"
import {assert} from 'chai'
import SampleInfo from "../src/igvCore/sample/sampleInfo.js"

suite("test sample info", function () {

    // Mock browser object
    const browser = {
        tracks: [{getSamples: function (){}}]
    }

    test('Sample Info', async function () {
        const sampleInfo = new SampleInfo(browser)
        await sampleInfo.loadSampleInfoFile('test/data/sample/GBM.txt')
        const attributes = sampleInfo.getAttributes("FALLS_p_TCGAaffxB4_1_GenomeWideSNP_6_C06_190576")
        assert.equal(sampleInfo.attributeCount, 12)
        assert.ok(sampleInfo.hasAttributes())
        assert.equal(attributes["Subtype"], "Proneural")
    })

    test('Sample table', async function () {
        const sampleInfo = new SampleInfo(browser)
        await sampleInfo.loadSampleInfoFile('test/data/sample/GBM-sampletable.txt')
        const attributes = sampleInfo.getAttributes("FALLS_p_TCGAaffxB4_1_GenomeWideSNP_6_C06_190576")
        assert.equal(sampleInfo.attributeCount, 12)
        assert.ok(sampleInfo.hasAttributes())
        assert.equal(attributes["Subtype"], "Proneural")
    })

    test('Sample mapping & colors', async function () {
        //TCGA-06-0173	Neural	0.084929651	FEMALE	NA	73	No	136	DEAD	0	Methylated	95	17.5
        const sampleInfo = new SampleInfo(browser)
        await sampleInfo.loadSampleInfoFile('test/data/sample/GBM-sampletable-samplemapping-colors.txt')
        const attributes = sampleInfo.getAttributes("FALLS_p_TCGAaffxB4_1_GenomeWideSNP_6_C06_190576")
        assert.equal(sampleInfo.attributeCount, 12)
        assert.ok(sampleInfo.hasAttributes())
        assert.equal(attributes["Subtype"], "Neural")   // Note the data files are inconsistent for this sample

        //*	Neural	10,150,220
        const color = sampleInfo.getAttributeColor("Subtype", "Neural")
        assert.equal(color, "rgb(10,150,220)")
    })


    // PLINK support is deprecated
    test('PLINK', async function () {
        const sampleInfo = await loadPlinkFile('test/data/misc/pedigree.fam')
        const attributes = sampleInfo.getAttributes('SS0012979')
        assert.ok(attributes)
        assert.equal(attributes["familyId"], "14109")

    })
})
