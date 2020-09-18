import loadCsiIndex from "../js/bam/csiIndex.js";
import loadBamIndex from "../js/bam/bamIndex.js"

import {assert} from 'chai';
import {setup} from "./util/setup.js";
import { XMLHttpRequestLocal } from './util/XMLHttpRequestLocal.js';
//import {XMLHttpRequest} from 'w3c-xmlhttprequest'
global.XMLHttpRequest = XMLHttpRequestLocal;


setup();

suite("testBamIndex", function () {


    test("load bam index", async function () {
        this.timeout(100000);
        const url = require.resolve("./data/bam/na12889.bam.bai");
        const bamIndex = await loadBamIndex(url, {}, false)
        assert.ok(bamIndex);
    })

    test("load csi index", async function () {
        this.timeout(100000);
        const url = require.resolve("./data/bam/na12889.bam.csi");
        const bamIndex = await loadCsiIndex(url, {}, false)
        assert.ok(bamIndex);
    })
});


