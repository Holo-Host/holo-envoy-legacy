import * as StaticServer from 'static-server'

export default (port) => {
  const server = new StaticServer({
    rootPath: './shims/happs',
    port
  })
  console.log('Static server running on port', port)
  server.start()
}

