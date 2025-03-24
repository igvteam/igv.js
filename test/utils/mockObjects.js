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

// Create a mock window object
const mockWindow = {
    document: new Document(),
    setTimeout: function () {},
    location: {
        href: ""
    },
    navigator: {
        userAgent: "Node",
        vendor: "Node"
    }
}

// Set up global objects
global.document = mockWindow.document
global.document.implementation = new DOMImplementation()    // For jQuery
global.window = mockWindow
global.File = File
global.XMLHttpRequest = XMLHttpRequestMock
global.DOMParser = DOMParser
global.atob = atob
global.btoa = btoa

// Export for use in tests
export {mockWindow}

