import { XMLHttpRequest } from 'w3c-xmlhttprequest';

global.XMLHttpRequest = XMLHttpRequest;

/// Mock objects
global.File = function () {};
global.navigator = {
    userAgent: "Node",
    vendor: "Node"
}

export default global;

