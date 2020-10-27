import {File} from "./File.js"
import {XMLHttpRequestMock} from "./XMLHttpRequestMock.js"
import {document} from "./document.js";

global.document = document;

global.window = {
    document,
    setTimeout: function () {
    }
}

global.File = File;
global.XMLHttpRequest = XMLHttpRequestMock;
global.navigator = {
    userAgent: "Node",
    vendor: "Node"
}


/**
 * Setup mock objects for unit tests
 * @param type   local|remote
 */
function createMockObjects() {
    // nothing to do, objects created on import
}

export {createMockObjects};

