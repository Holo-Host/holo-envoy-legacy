import test from 'tape'
import {lookupInstance} from '../src/server'

const mockClient = {
  call: (method) => {
    switch (method) {
      case 'info/instances':
        return []
    }
  }
}

test('can lookupInstance', t => {

})