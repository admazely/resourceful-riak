#resourceful-riak

A Riak engine to the [resourceful](https://github.com/flatiron/resourceful/) model framework from [flatiron](https://github.com/flatiron/).

#### Acknowledgement

resourceful-riak builds heavily on the code from the couchdb engine included in resourceful.

## Example

This is the example from resourceful, adapted to work with resourceful-riak.

``` js
  var resourceful = require('resourceful');
  require('resourceful-riak');
  
  var Creature = resourceful.define('creature', function () {
    //
    // Specify a storage engine
    //
    this.use('riak', {
      bucket: "creatures" // bucket must always be set when using the riak engine
    });
    
    //
    // Specify some properties with validation
    //
    this.property('diet'); // Defaults to String
    this.property('vertebrate', Boolean);
    this.property('belly', Array);
  });
  
  //
  // Now that the `Creature` prototype is defined
  // we can add custom logic to be available on all instances
  //
  Creature.prototype.feed = function (food) {
    this.belly.push(food);
  };
```

## Motivation

Resourceful is a simple yet powerful model framework from the infamous heroes at nodejitsu. Sadly it didn't support Riak (which we use extensively at admaze.ly), so we fixed that.

## API Documentation

Today, resourceful-riak support all of the creation, deletion and modifyfing methods that resourceful supply (se [README.md](https://github.com/flatiron/resourceful/blob/master/README.md) from resourceful for details).
Going forward, we hope to implement both more advanced resourceful functionality (like filters and relationships) as well as riak-specific futures (like links and secondary indexes).

## Installation

### Installing npm (node package manager)
``` bash
  $ curl http://npmjs.org/install.sh | sh
```

### Installing resourceful
``` bash 
  $ [sudo] npm install resourceful
```

### Installing resourceful-riak
``` bash
  $ [sudo] npm install resourceful-riak
```

## Tests
All tests are written with [vows][0] and should be run with [npm][1]:

``` bash
  $ npm test
```

#### Author: [David Björklund](http://github.com/kesla)
#### License: Apache 2.0