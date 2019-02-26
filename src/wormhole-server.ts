import express from 'express'
import bodyParser from 'body-parser'


export default (port) => {

  const app = express()
  app.use(bodyParser.json())
  
  app.post('/', (req, res) => {
    const {agentKey, entry} = req.body
    
  })

  app.listen(port, () => console.log(`Example app listening on port ${port}!`))
}