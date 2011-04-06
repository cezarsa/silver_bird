
Persistence = {
  load: function (key) {
    return new ValueWrapper(key);
  },

  isObject: function(key) {
    return !!this.objectKeys[key];
  },

  addObject: function(key) {
    this.objectKeys[key] = true;
    this.objectKeysVar.save(this.objectKeys);
  },

  /* Creating helper methods for each persistence entry (load() shoudn't be used directly) */
  init: function() {
    this.objectKeys = {'object_keys': true};
    this.objectKeysVar = this.load('object_keys');
    this.objectKeys = this.objectKeysVar.val() || {};

    var existingKeys = ['options', 'selected_lists', 'timeline_order', 'oauth_token_data',
      'oauth_token_service', 'version', 'popup_size', 'window_position'];

    var _this = this;
    for(var i = 0, len = existingKeys.length; i < len; ++i) {
      var currentKey = existingKeys[i];
      var methodName = currentKey.replace(/_(\w)/g, function(m1, m2) { return m2.toUpperCase(); });
      /* Ohh, so sad I can't just use the 'let' keyword */
      this[methodName] = (function(key) {
        return function() {
          return _this.load(key);
        };
      })(currentKey);
    }
  },

  cleanupOldData: function() {
    localStorage.removeItem('password');
    localStorage.removeItem('logged');
    localStorage.removeItem('username');
    localStorage.removeItem('remember');
    localStorage.removeItem('currentTheme');
  }
};

function ValueWrapper(key) {
  this.key = key;
}
ValueWrapper.prototype = {
  save: function(value) {
    if((typeof value) != 'string') {
      if(!Persistence.isObject(this.key)) {
        Persistence.addObject(this.key);
      }
      value = JSON.stringify(value);
    }
    localStorage[this.key] = value;
    return value;
  },
  val: function() {
    var value = localStorage[this.key];
    if(!value) {
      return undefined;
    }
    if(Persistence.isObject(this.key)) {
      value = JSON.parse(value);
    }
    return value;
  },
  remove: function() {
    return localStorage.removeItem(this.key);
  }
};

Persistence.init();