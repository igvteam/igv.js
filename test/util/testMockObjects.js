import { XMLHttpRequestMock, XMLHttpRequestLocal } from './XMLHttpRequestMock.js';

global.XMLHttpRequest = XMLHttpRequestLocal;

/// Mock objects
global.File = function () {};
global.navigator = {
    userAgent: "Node",
    vendor: "Node"
}

export default global;

