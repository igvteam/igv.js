import {WebSocket, WebSocketServer} from 'ws'
import readline from 'readline'

/**
 * Websocket server for testing the igv.js websocket interface
 */


class IGVWebSocketServer {

    constructor({host = 'localhost', port = 60141, path = '/'}) {

        this.wss = new WebSocketServer({host, port, path})

        this.wss.on('connection', (ws) => {

            // Limit connections to a single client
            if (this.wss.clients.size > 1) {
                console.warn('Connection rejected: A client is already connected.')
                ws.send('Connection rejected: A client is already connected.')
                ws.terminate()
                return
            }

            console.warn('Client connected')

            ws.on('close', () => {
                console.warn('Client disconnected. Total clients:', this.wss.clients.size)
            })

            ws.send('Server: connection established')

        })
    }

    // Add a close method for graceful shutdown
    close() {
        if (this.wss) {
            try {
                this.wss.close()
            } catch (e) {
                console.warn('Error closing WebSocketServer', e)
            }
        }
    }

    async send(message) {

        message.uniqueID = generateUniqueID()

        return new Promise((resolve) => {

            if (this.wss.clients.size === 0) {
                resolve({
                    message:"No client connection.  Is IGV-Web running?",
                    status: 'error'})
                return
            }

            // There should be at most 1 client
            const client = this.wss.clients.values().next().value

            if (client.readyState !== WebSocket.OPEN) {
                resolve({
                    message:"Client connection is not open.  Is IGV-Web running?",
                    status: 'error'})
                return
            }

            const messageListener = (data) => {
                try {
                    console.error(`Received response from IGV ${data}`)
                    const response = JSON.parse(data)
                    if (response.uniqueID === message.uniqueID) {
                        cleanup()
                        console.error(`Resolving ${response}`)
                        resolve(response)
                    }
                } catch (e) {
                    console.error("Error parsing JSON response from client", e)
                    // Optional: reject on parse error, or just wait for a valid message
                }
            }

            const timeout = setTimeout(() => {
                cleanup()
                console.error(`Timeout: No response for message id ${message.uniqueID}`)
                resolve({
                    message: `Timeout: No response for message id ${message.uniqueID}`,
                    status: 'error'
                })
            }, 10000) // 10-second timeout

            const cleanup = () => {
                clearTimeout(timeout)
                // Use removeListener for compatibility
                try {
                    client.removeListener('message', messageListener)
                } catch (e) {
                    // ignore
                }
            }

            client.on('message', messageListener)

            try {
                client.send(JSON.stringify(message))
            } catch (e) {
                console.error(`Error ${e}`)
                cleanup()
                resolve({
                    message: `Error sending message ${e}`,
                    status: 'error'
                })
            }
        })
    }
}


function generateUniqueID() {
    const timestamp = Date.now().toString(36)
    const randomPart = Math.random().toString(36).substring(2)
    return `${timestamp}${randomPart}`
}

async function main() {

    // Parse command line arguments
    const args = process.argv.slice(2)
    let host = "localhost"
    let port = 60141

    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--host" && i + 1 < args.length) host = args[i + 1]
        else if (args[i] === "--port" && i + 1 < args.length) port = parseInt(args[i + 1], 10)
    }

    // Initialize IGV connection
    const webSocketServer = new IGVWebSocketServer({host, port})

    // Set up a non-blocking interactive stdin loop using readline. Users can type JSON
    // commands (one per line) that will be sent to the connected client. Type `exit` to stop.
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: 'ws> '
    })

    rl.prompt()

    rl.on('line', (line) => {
        const trimmed = line.trim()
        if (!trimmed) {
            rl.prompt()
            return
        }

        if (trimmed === 'exit' || trimmed === 'quit') {
            console.log('Shutting down server...')
            rl.close()
            webSocketServer.close()
            process.exit(0)
            return
        }

        // Process commands asynchronously so the readline loop remains non-blocking
        ;(async () => {
            // Allow a shorthand: if input doesn't start with { or [, treat it as a command type
            let message
            if ((trimmed.startsWith('{') || trimmed.startsWith('['))) {
                try {
                    message = JSON.parse(trimmed)
                } catch (e) {
                    console.error('Invalid JSON:', e.message)
                    rl.prompt()
                    return
                }
            } else {
                // simple command -> send as {type: command}
                message = {type: trimmed}
            }

            const response = await webSocketServer.send(message)
            console.log('Response:', response)
            rl.prompt()
        })()

    }).on('close', () => {
        console.log('Input closed')
        webSocketServer.close()
    })

    // Graceful shutdown on SIGINT
    process.on('SIGINT', () => {
        console.log('\nSIGINT received. Shutting down...')
        rl.close()
        webSocketServer.close()
        process.exit(0)
    })

}

main().catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
})
