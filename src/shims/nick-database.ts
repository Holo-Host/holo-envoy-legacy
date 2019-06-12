
/**
 * Information about the "nickname" of known DNAs. This is used to assign
 * consistent instance IDs which UIs can reference globally. All conductors
 * should use the nickname listed here for a DNA's instance ID. This whole
 * nickname thing will get replaced by "bundle handles" eventually.
 */
export const nickDatabase = [
  {
    nick: 'basic-chat',
    knownDnaHashes: [
      'QmbPqQJzvWR3sT4ixHqB4cJ6v96Fy3zGNY5svpXnpBHLm6',
      'QmS7TuxiFwmGRig9b7v8mhXqT5LPz9ZSTmkwSpWyovDVkW',
    ],
  },
  {
    nick: 'simple-app',
    knownDnaHashes: [
      'QmSKxN3FGVrf1vVMav6gohJVi7GcF4jFcKVDhDcjiAnveo',
    ]
  },
  {
    nick: 'QmYhReByy4kHs3tAdUGSSfUBhvkhTTcfFvnSBCqAr2KZpq',
    knownDnaHashes: [
      'QmUrd3q8fF71VM3eA1mSEhcEzRsAiE8XiLnMZXBW6omHdV',
    ]
  },
  {
    nick: 'holofuel',
    knownDnaHashes: [
      'QmUrd3q8fF71VM3eA1mSEhcEzRsAiE8XiLnMZXBW6omHdV',
    ]
  },
  {
    nick: 'holofuel-holo',
    knownDnaHashes: [
      'QmUrd3q8fF71VM3eA1mSEhcEzRsAiE8XiLnMZXBW6omHdV',
      'QmTjGiTEv8Fz6KuP5qzVRqbNw9pxp3mwXPjvV2pf99sKJz',
    ]
  }
]
