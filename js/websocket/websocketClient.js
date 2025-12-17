import handleMessage from "./messageHandler.js"

/**
 * Create a WebSocket client that connects to a server and handles messages.  The client attempts to connect to a
 * WebSocketServer upon creation.  If the connection is not successful or lost, it will attempt to reconnect with an
 * exponential backoff strategy.  Incoming messages are expected to be JSON formatted and are processed by the
 * handleMessage function.  Messages encompass a subset of the igv.js API
 *
 * This client was created to interact with an MCP server, but could be used for other purposes.
 *
 * @param host Host for the WebSocket server
 * @param port Port for the WebSocket server
 * @param browser The igv.js browser instance
 */

export function createWebSocketClient(host, port, browser) {

    let socket
    let retryInterval = 1000    // Initial retry interval in ms
    const maxRetryInterval = 10000 // Maximum retry interval in ms
    let reconnectTimer

    function connect() {

        const isLocal = host === 'localhost' || host === '127.0.0.1'
        const protocol = window.location.protocol === 'https:' && !isLocal ? 'wss:' : 'ws:'
        socket = new WebSocket(`${protocol}//${host}:${port}`)

        //  helper to safely send
        const sendJSON = (obj) => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify(obj))
            }
        }

        socket.addEventListener('open', function (event) {
            retryInterval = 1000 // Reset retry interval on successful connection
            sendJSON({message: 'Hello from browser client'})
        })

        // Listen for incoming messages
        socket.addEventListener('message', async function (event) {
            try {
                const json = JSON.parse(event.data)

                if("close" === json.type) {
                    // TODO -- close without starting the retry interval
                }

                const returnMsg = await handleMessage(json, browser)
                sendJSON(returnMsg)

            } catch (e) {
                if (e instanceof SyntaxError) {
                    console.warn('Received non-JSON message from server:', event.data)
                } else {
                    console.error('Error handling message:', e)
                    sendJSON({
                        status: 'error',
                        message: `Error handling message: ${e.message || e.toString()}`
                    })
                }
            }
        })

        socket.addEventListener('error', function (event) {
            console.error('WebSocket error:', event)
            // The 'close' event will fire immediately after 'error', triggering the reconnect logic.
        })

        socket.addEventListener('close', function (event) {
            console.log('Disconnected from server. Retrying in ' + (retryInterval / 1000) + ' seconds.')
            clearTimeout(reconnectTimer)
            reconnectTimer = setTimeout(connect, retryInterval)
            // Increase retry interval for next time, up to a max
            retryInterval = Math.min(maxRetryInterval, retryInterval * 2)
        })
    }

    connect() // Initial connection attempt

    window.addEventListener('beforeunload', function (event) {
        clearTimeout(reconnectTimer) // Don't try to reconnect when page is closing
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.close()
        }
    })
}

export default createWebSocketClient