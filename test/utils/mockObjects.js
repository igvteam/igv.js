/**
 * Define global mock objects for running unit tests in Node.  This file is imported for side effects only and
 * has no exports.
 */

import {File} from "./File.js"
import {XMLHttpRequestMock} from "./XMLHttpRequestMock.js"
import {Document, DOMImplementation} from "./Document.js"
import {DOMParser} from "./DOMParser.js"
import atob from 'atob'
import btoa from 'btoa'

global.document = new Document()

global.document.implementation = new DOMImplementation()    // For jQUery

global.window = {
    document: global.document,
    setTimeout: function () {
    },
    location : {
        href: ""
    }
}

global.File = File

global.XMLHttpRequest = XMLHttpRequestMock

global.navigator = {
    userAgent: "Node",
    vendor: "Node"
}

global.DOMParser = DOMParser

global.atob = atob

global.btoa = btoa

