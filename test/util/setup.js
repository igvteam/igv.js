import {File} from "./File.js"


function setup() {

    global.File = File;


    global.navigator = {
        userAgent: "Node",
        vendor: "Node"
    }

}

export {setup};

