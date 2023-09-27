import "./utils/mockObjects.js"
import {assert} from 'chai'
import Hub from "../js/ucsc/ucscHub.js"
import Trix from "../js/ucsc/trix.js"
import BWReader from "../js/bigwig/bwReader.js"


suite("ucsc utilities", function () {


    test("hub.txt", async function () {

        this.timeout(200000)

        const hub = await Hub.loadHub({url: "https://hgdownload.soe.ucsc.edu/hubs/GCF/000/186/305/GCF_000186305.1/hub.txt"})
        assert.ok(hub.hub)
        assert.ok(hub.genomeStanza)
        assert.equal(22, hub.trackStanzas.length)

        const genomeConfig = hub.getGenomeConfig()
        //const genome = await GenomeUtils.loadGenome(genomeConfig)

        assert.ok(genomeConfig)
        assert.equal("GCF_000186305.1", genomeConfig.id)
        assert.equal("Python bivittatus", genomeConfig.name)
        assert.ok(genomeConfig.twobitURL)
        assert.ok(genomeConfig.aliasBbURL)
        assert.ok(genomeConfig.cytobandBbURL)

        //const genome = await GenomeUtils.loadGenome(genomeConfig)
        //assert.ok(genome)

    })

    test("trix", async function () {

        this.timeout(200000)
        const ixFile = "https://hgdownload.soe.ucsc.edu/hubs/GCF/019/356/215/GCF_019356215.1/ixIxx/GCF_019356215.1_ASM1935621v1.ncbiGene.ix"
        const ixxFile = "https://hgdownload.soe.ucsc.edu/hubs/GCF/019/356/215/GCF_019356215.1/ixIxx/GCF_019356215.1_ASM1935621v1.ncbiGene.ixx"

        const trix = new Trix(ixxFile, ixFile, 10)

        const results = await trix.search("adeG")

        console.log(results)

    })

    /**
     * Test parsing a aliasBbURL file from the T2T hub
     */
    test("test chromAlias", async function () {

        const url = "https://hgdownload.soe.ucsc.edu/hubs/GCF/019/356/215/GCF_019356215.1/bbi/GCF_019356215.1_ASM1935621v1.ncbiGene.bb"

        const bbReader = new BWReader({url: url, format: "bigbed"})
        const header = await bbReader.loadHeader()
        assert.ok(header)
    })

})

/*  Example genome stanza
genome GCF_000186305.1
taxId 176946
groups groups.txt
description Burmese python
twoBitPath GCF_000186305.1.2bit
twoBitBptUrl GCF_000186305.1.2bit.bpt
chromSizes GCF_000186305.1.chrom.sizes.txt
chromAliasBb GCF_000186305.1.chromAlias.bb
organism Python_molurus_bivittatus-5.0.2 Sep. 2013
defaultPos NW_006532014.1:484194-494194
scientificName Python bivittatus
htmlPath html/GCF_000186305.1_Python_molurus_bivittatus-5.0.2.description.html
blat dynablat-01.soe.ucsc.edu 4040 dynamic GCF/000/186/305/GCF_000186305.1
transBlat dynablat-01.soe.ucsc.edu 4040 dynamic GCF/000/186/305/GCF_000186305.1
isPcr dynablat-01.soe.ucsc.edu 4040 dynamic GCF/000/186/305/GCF_000186305.1
 */