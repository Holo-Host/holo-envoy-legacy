

export const errorResponse = msg => ({
  error: msg
})

export const fail = e => console.error("FAIL: ", e)