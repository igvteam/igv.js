import {File} from "./File.js"
import {XMLHttpRequestMock} from "./XMLHttpRequestMock.js"


/**
 * Setup mock objects for unit tests
 * @param type   local|remote
 */
function setup() {

    global.File = File;
    global.XMLHttpRequest = XMLHttpRequestMock;
    global.navigator = {
        userAgent: "Node",
        vendor: "Node"
    }
    global.genome = {
        getChromosomeName: function (chr) {
            return chr.startsWith("chr") ? chr : "chr" + chr;
        }
    }
}

export {setup};

