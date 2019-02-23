
import * as tar from 'tar-fs'
import * as fs from 'fs'

export const errorResponse = msg => ({
  error: msg
})

export const fail = e => console.error("FAIL: ", e)


export const bundle = (input, target) => 
  tar.pack(input).pipe(fs.createWriteStream(target))

export const unbundle = (input, target) => 
  fs.createReadStream(input).pipe(tar.extract(target))

// from https://decembersoft.com/posts/promises-in-serial-with-array-reduce/
export const sequentialPromises = tasks => tasks.reduce((promiseChain, currentTask) => {
  return promiseChain.then(chainResults =>
    currentTask.then(currentResult =>
      [ ...chainResults, currentResult ]
    )
  );
}, Promise.resolve([]))