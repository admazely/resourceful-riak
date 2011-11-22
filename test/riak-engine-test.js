// The base for this file is the test for the
// couchdb-engine (couchdb-engine-test.js).
 
var path = require('path'),
    sys = require('sys'),
    assert = require('assert'),
    events = require('events'),
    http = require('http'),
    fs = require('fs'),
    vows = require('vows'),
    riak = require('riak-js'),
    resourceful = require('resourceful'),
    async = require('async');

require('../index');

resourceful.env = 'test';

vows.describe('resourceful/engines/database').addVows({
  "A database containing default resources": {
    topic: function () {
      var promise = new(events.EventEmitter);
      var db = riak.getClient({returnbody: true});
      // destroy all data in the bucket 'test', that we're using for the tests
      db.keys('test', function(err, keys) {
        async.map(keys, db.remove.bind(db, 'test'), function(err, result) {
          async.map([
            {key: 'bob', data: {age: 35, hair: 'black', resource: 'User'}},
            {key: 'tim', data: {age: 16, hair: 'brown', resource: 'User'}},
            {key: 'mat', data: {age: 29, hair: 'black', resource: 'User'}}
          ], function(prop, cb) {
            db.save('test', prop.key, prop.data, cb);
          }, function(e, res) {
            promise.emit('success', res);
          });
        });
      });
      return promise;
    },
    "is created": function (e, obj) {
      assert.isNull(e);
      assert.isArray(obj);
    }
  }
}).addVows({
  "A default Resource factory" : {
    topic: function() {
      return this.Factory = resourceful.define('user', function () {
        this.use('riak', {uri: 'localhost:8098', bucket: "test"});
      });
    },
    "a create() request": {
      topic: function (r) {
        r.create({ _id: '99', age: 30, hair: 'red'}, this.callback);
      },
      "should return the newly created object": function (e, obj) {
        assert.instanceOf(obj,this.Factory);
        assert.equal(obj.id,'99');
      },
/*      "should assign the _rev property": function (e, obj) {
        assert.isString(obj._etag);
      },*/
      "should create the record in the db": {
        topic: function (_, r) {
          r.get('99', this.callback);
        },
        "which can then be retrieved": function (e, res) {
          assert.isObject(res);
          assert.equal(res.age, 30);
//          assert.isString(res._rev);
        },
        "and updated": {
          topic: function (r) {
            r.update({ hair: 'blue'}, this.callback);
          },
          "which can then be retrieved": function (e, res) {
            assert.isObject(res);
            assert.equal(res.hair, 'blue');
//            assert.isString(res._rev);
          }
        }
      }
    },
    "a get() request": {
      "focus: when successful": {
        topic: function (r) {
          return r.get('bob', this.callback);
        },
        "should respond with a Resource instance": function (e, obj) {
          assert.isObject(obj);
          assert.instanceOf(obj, resourceful.Resource);
          assert.equal(obj.constructor, this.Factory);
        },
/*        "should include the _rev property": function (e, obj) {
          assert.isString(obj._rev);
        },*/
        "should respond with the right object": function (e, obj) {
          assert.isNull(e);
          assert.equal(obj._id, 'bob');
        },
        "should store the object in the cache": function () {
          assert.isObject(this.Factory.connection.cache.store['bob']);
//          assert.isString(this.Factory.connection.cache.store['bob']._rev);
        },
        "followed by an update() request": {
          topic: function (r) {
            return r.update({ nails: 'long' }, this.callback);
          },
          "should respond successfully": function (e, obj) {
            assert.isNull(e);
            assert.ok(obj);
          },
          "followed by another update() request": {
            topic: function (_, r) {
              r.update({ age: 37 }, this.callback);
            },
            "should respond successfully": function (e, res) {
              assert.isNull(e);
            },
            "should save the latest revision to the cache": function (e, res) {
              assert.equal(this.Factory.connection.cache.store['bob'].age, 37);
//              assert.match(this.Factory.connection.cache.store['bob']._rev, /^3-/);
            }
          }
        }
      },
      "when unsuccessful": {
        topic: function (r) {
          r.get("david", this.callback);
        },
        "should respond with an error": function (e, obj) {
          assert.isTrue(e.notFound);
          assert.equal(e.statusCode, 404);
          assert.isUndefined(obj);
        }
      }
    }
  }
}).addBatch({
  "A default Resource factory" : {
    topic: function() {
      return this.Factory = resourceful.define('user', function () {
        this.use('riak', {uri: 'localhost:8098', bucket: "test"});
      });
    },
    "an all() request": {
      topic: function (r) {
        r.all(this.callback);
      },
      "should respond with an array of all records": function (e, obj) {
        assert.isNull(e);
        assert.isArray(obj);
        assert.equal(obj.length, 4);
      }
    }
  }
}).addBatch({
  "A default Resource factory" : {
    topic: function() {
      return this.Factory = resourceful.define('user', function () {
        this.use('riak', {uri: 'localhost:8098', bucket: "test"});
      });
    },
    "a get() request": {
      topic: function (r) {
        r.get('bob', this.callback);
      },
      "should respond with the resource": function (err, obj) {
        assert.equal(obj._id,'bob');
      },
      "an update() request": {
        topic: function (_, r) {
          this.cache = r.connection.cache;
          r.update('bob', { age: 30, newProp: 'is-set' }, this.callback);
        },
        "should respond successfully": function (e, res) {
          assert.isNull(e);
        },
        "should save the latest revision to the cache": function (e, res) {
          assert.equal(this.cache.store['bob'].age, 30);
//          assert.match(this.cache.store['bob']._rev, /^4-/);
        },
        "followed by another get() request": {
          topic: function (_, _, r) {
            r.get('bob', this.callback);
          },
          "should respond with the updated resource": function (err, obj) {
            assert.equal(obj._id,'bob');
            assert.equal(obj.age,30);
            assert.equal(obj.newProp,'is-set');
          },
          "followed by another update() request": {
            topic: function (_, _, _, r) {
              r.update('bob', { age: 40 }, this.callback);
            },
            "should respond successfully": function (e, res) {
              assert.isNull(e);
            },
            "should save the latest revision to the cache": function (e, res) {
              assert.equal(this.cache.store['bob'].age, 40);
//              assert.match(this.cache.store['bob']._rev, /^5-/);
            }
          }
        }
      }
    }
  }
}).addBatch({
  "A default Resource factory" : {
    topic: function() {
      return this.Factory = resourceful.define('user', function () {
        this.use('riak', {uri: 'localhost:8098', bucket: "test"});
      });
    },
    "a save() request": {
      topic: function(r) {
        this.user = new this.Factory({
          _id: 'David',
          age: 26
        });
        
        this.user.save(this.callback);
      },
      "[in cache] should save the object": function() {
        var obj = this.Factory.connection.cache.store['David'];
        assert.isObject(obj);
        assert.equal(obj._id, 'David');
        assert.equal(obj.age, 26);
      },
      "[in database]": {
        topic: function() {
          var db = riak.getClient();
          db.get('test', 'David', this.callback);
        },
        "should create object": function(e, obj) {
          assert.isNull(e);
          assert.isObject(obj);
          assert.equal(obj.age, 26);
        }
      }
    }
  }
}).addBatch({
  "A default Resource factory" : {
    topic: function() {
      return this.Factory = resourceful.define('user', function () {
        this.use('riak', {uri: 'localhost:8098', bucket: "test"});
      });
    },
    "a destroy() request on an existing model": {
      topic: function(r) {
        r.destroy("David", this.callback);
      },
      "[in cache] should delete the object": function(e, res) {
        assert.isUndefined(this.Factory.connection.cache.store['David']);
      },
      "[in database]": {
        topic: function() {
          var db = riak.getClient();
          db.exists('test', 'David', this.callback);
        },
        "should delete object": function(e, res) {
          assert.isNull(e);
          assert.isFalse(res);
        }
      }
    }
  }
}).export(module);
