const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.DEBUG_LEVEL || 'fatal',
});

const assert				= require('assert');
const expect				= require('chai').expect;

const Server				= require('../../lib/server.js');

describe("Envoy e2e tests", () => {

    it("No tests yet", async () => {
	expect( true ).to.be.true;
    });
    
});
