import "./utils/mockObjects.js"
import BGZBlockLoader, {inflateBlocks, findBlockBoundaries} from "../js/bam/bgzBlockLoader.js"
import {assert} from 'chai'
import fs from 'fs'

const inflatedBlockSize = 65536

suite("test BGZBlockLoader", function () {

    test("inflate blocks", async function () {
        const path = require.resolve("./data/tabix/sorted.genes.gtf.gz")
        const b = fs.readFileSync(path)
        const arrayBuffer = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)

        // Block positions: 113873, 118394, 122728, 127139, 131295
        // Inflate all blocks
        let startBlock = 113873
        let endBlock = 131295
        let blocks = await inflateBlocks(arrayBuffer, startBlock, endBlock)
        assert.equal(blocks.length, 5)
        let sz = 0
        for (let b of blocks) {
            sz += b.byteLength
        }
        assert.equal(327680, sz)

        // Inflate subset of blocks
        startBlock = 118394
        endBlock = 127139
        blocks = await inflateBlocks(arrayBuffer, startBlock, endBlock)
        assert.equal(blocks.length, 3)
    })

    test("load individual blocks", async function () {

        const config = {
            url: require.resolve("./data/tabix/sorted.genes.gtf.gz"),
        }

        const positions = [113873, 118394, 122728, 127139, 131295]

        for (let b of positions) {
            const loader = new BGZBlockLoader(config)
            const blocks = await loader.getInflatedBlocks(b, b)
            assert.equal(blocks.length, 1)
            assert.equal(blocks[0].byteLength, inflatedBlockSize)
        }
    })

    test("load and inflate blocks", async function () {

        const startBlock = 113873
        const endBlock = 131295
        const config = {
            url: require.resolve("./data/tabix/sorted.genes.gtf.gz"),
        }

        const loader = new BGZBlockLoader(config)
        const blocks = await loader.getInflatedBlocks(startBlock, endBlock)
        assert.equal(blocks.length, 5)
        let sz = 0
        for (let b of blocks) {
            sz += b.byteLength
        }
        assert.equal(sz, 5 * inflatedBlockSize)
    })

    test("cache - inner overlap", async function () {

        const config = {
            url: require.resolve("./data/tabix/sorted.genes.gtf.gz"),
        }

        const loader = new BGZBlockLoader(config)

        // Prime cache
        await loader.getInflatedBlocks(113873, 131295)

        // Query for blocks contained within cached region
        const startBlock = 118394
        const endBlock = 127139
        const blocks = await loader.getInflatedBlocks(startBlock, endBlock)
        assert.equal(blocks.length, 3)
        let sz = 0
        for (let b of blocks) {
            sz += b.byteLength
        }
        assert.equal(sz, 3 * inflatedBlockSize)
    })

    test("cache - overlap left", async function () {


        const config = {
            url: require.resolve("./data/tabix/sorted.genes.gtf.gz"),
        }

        const loader = new BGZBlockLoader(config)

        // Prime cache
        await loader.getInflatedBlocks(118394, 127139)

        // Block positions: 113873, 118394, 122728, 127139, 131295
        const startBlock = 113873
        const endBlock = 122728
        let blocks = await loader.getInflatedBlocks(startBlock, endBlock)
        assert.equal(blocks.length, 3)
        let sz = 0
        for (let b of blocks) {
            sz += b.byteLength
        }
        assert.equal(sz, 3 * inflatedBlockSize)
    })

    test("cache - overlap right", async function () {

        const config = {
            url: require.resolve("./data/tabix/sorted.genes.gtf.gz"),
        }

        const loader = new BGZBlockLoader(config)

        // Prime cache
        await loader.getInflatedBlocks(118394, 127139)


        // Block positions: 113873, 118394, 122728, 127139, 131295
        const startBlock = 122728
        const endBlock = 131295
        const blocks = await loader.getInflatedBlocks(startBlock, endBlock)
        assert.equal(blocks.length, 3)
        let sz = 0
        for (let b of blocks) {
            sz += b.byteLength
        }
        assert.equal(sz, 3 * inflatedBlockSize)

    })

    test("cache - outer overlap", async function () {

        const config = {
            url: require.resolve("./data/tabix/sorted.genes.gtf.gz"),
        }

        const loader = new BGZBlockLoader(config)

        // Prime cache
        await loader.getInflatedBlocks(118394, 127139)

        // Block positions: 113873, 118394, 122728, 127139, 131295
        const startBlock = 113873
        const endBlock = 131295
        const blocks = await loader.getInflatedBlocks(startBlock, endBlock)
        assert.equal(blocks.length, 5)
        let sz = 0
        for (let b of blocks) {
            sz += b.byteLength
        }
        assert.equal(sz, 5 * inflatedBlockSize)
    })

    test("bam", async function () {
        const config = {
            url: require.resolve("./data/bam/gstt1_sample.bam"),
        }
        const positions = [0, 766, 15628, 30107, 43153, 55599, 60844]
        const sizes = [1479,65220,65171,65262,65240,26657]
        for (let i = 0; i < positions.length - 1; i++) {
            const b = positions[i]
            const loader = new BGZBlockLoader(config)
            const blocks = await loader.getInflatedBlocks(b, b)
            assert.equal(blocks[0].byteLength , sizes[i])
        }

    })


})



