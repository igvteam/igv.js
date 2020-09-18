import {File} from "./File.js"


function createMockObjects() {

    global.File = File;


    global.navigator = {
        userAgent: "Node",
        vendor: "Node"
    }

}

export {createMockObjects};

