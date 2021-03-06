var resourceful = require('resourceful');

var Riak = resourceful.engines.Riak = function(config) {
  if(config && config.bucket) {
    this.bucket = config.bucket;
  } else {
    throw new Error('bucket must be set in the config for each model.')
  }

  this.client = config.client || require('riak-js').getClient(config);
  
  this.cache = new resourceful.Cache();
}

Riak.prototype.protocol = 'riak';

Riak.prototype.save = function (key, value, callback) {
  var that = this;

  if(!callback) {
    callback = value;
    value = key;
    key = null;
  }
  this.client.save(this.bucket, key, value, {}, function(e, _, meta) {
    if(e) {
      callback(e);
    } else {
      value._id = meta.key;
      that.cache.put(value._id, value);
      callback(null, value);
    }
  });
};

Riak.prototype.get = function (key, callback) {
  this.client.get(this.bucket, key, {}, function(e, value, meta) {
    if(e) {
      callback(e);
    } else {
      value._id = meta.key;
      callback(e, value);
    }
  });
}

Riak.prototype.update = function(key, val, callback) {
  var that = this;
  that.get(key, function(err, old) {
    that.save(key, resourceful.mixin(old, val), callback);
  });
}

Riak.prototype.all = function(callback) {
  this.client.getAll(this.bucket, function(e, all) {
    if(e) {
      callback(e);
    } else {
      var models = all.map(function(obj) {
        return obj.data;
      });
      callback(null, models);
    }
  });
}

Riak.prototype.destroy = function(key, callback) {
  this.client.remove(this.bucket, key, callback);
}
