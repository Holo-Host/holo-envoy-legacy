/**
 * Unit tests
 *
 * Some notes on the testing and mocking strategy:
 *
 * Many of these tests are checking that a particular websocket is being called
 * with the correct arguments, and that those calls are happening in the right order.
 *
 * Therefore, the only functions that should be mocked are:
 * - functions that try to talk to the world like `fs` and `axios`
 * - the `call` function on the WS client, which is what we use to check the proper calls
 *
 * Mocking anything else will ruin this level of granularity that we want to check
 */

// console.debug = () => {}
// console.info = () => {}

require('./test-install-happ')
require('./test-new-agent')
require('./test-zome-call')