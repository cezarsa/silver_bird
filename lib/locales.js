var LocaleTable = function() {
  this.locales = {};
  this.defaultLocale = null;
  this.ready = false;
  this.waitingCallback = null;
  this.loadData();
};

LocaleTable.prototype = {
  getLocales: function(callback) {
    if(this.ready) {
      callback(this.locales);
      return;
    }
    this.waitingCallback = callback;
  },

  loadData: function(readyCallback) {
    var _this = this;
    this.loadDefaultLocale(function(defaultLocale) {
      _this.defaultLocale = defaultLocale;
      _this.loadLocaleMessages(function(locales) {
        _this.locales = locales;
        _this.ready = true;
        if(_this.waitingCallback) {
          _this.waitingCallback(locales);
          _this.waitingCallback = null;
        }
      });
    });
  },

  loadDefaultLocale: function(callback) {
    Util.ajax(function(status, data) {
      if(data) {
        data = JSON.parse(data);
        callback(data.default_locale);
      }
    }, chrome.extension.getURL('manifest.json'));
  },

  parsePlaceholders: function(localeData) {
    for(var key in localeData) {
      var localizedEntry = localeData[key];
      if(localizedEntry.placeholders) {
        localizedEntry.parsedPlaceholders = [];
        for(var placeEntry in localizedEntry.placeholders) {
          var placeholder = localizedEntry.placeholders[placeEntry];
          var position = parseInt(placeholder.content.substring(1), 10) - 1;
          localizedEntry.parsedPlaceholders.push({position: position, key: '$' + placeEntry + '$'});
        }
      }
    }
  },

  loadLocaleMessages: function(callback) {
    var remainingLocalesMap = {};
    for(var k = 0, codesLen = LocaleTable.availableLocaleCodes.length; k < codesLen; ++k) {
      remainingLocalesMap[LocaleTable.availableLocaleCodes[k]] = true;
    }
    var locales = {};
    var _this = this;
    var updateLocaleCallback = function(localeCode, data) {
      delete remainingLocalesMap[localeCode];
      if(data) {
        locales[localeCode] = data;
        _this.parsePlaceholders(data);
      }
      if(Util.isEmptyObject(remainingLocalesMap)) {
        callback(locales);
      }
    };
    for(var i = 0, len = LocaleTable.availableLocaleCodes.length; i < len; ++i) {
      var localeCode = LocaleTable.availableLocaleCodes[i];
      (function(localeCode) {
        Util.ajax(function(status, data) {
          if(data) {
            try {
              data = JSON.parse(data);
            } catch(e) {
              console.log('Invalid JSON', data, e);
            }
          }
          updateLocaleCallback(localeCode, data);
        }, chrome.extension.getURL('_locales/' + localeCode + '/messages.json'));
      })(localeCode);
    }
  }
};
LocaleTable.availableLocaleCodes = ["az", "am", "ar", "bg", "bn", "ca", "cs", "da", "de", "el", "en", "en_GB", "en_US", "es",
  "es_419", "et", "fi", "fil", "fr", "gu", "he", "hi", "hr", "hu", "id", "it", "ja", "kn", "ko", "lt", "lv",
  "ml", "mr", "nb", "nl", "or", "pl", "pt", "pt_BR", "pt_PT", "ro", "ru", "sk", "sl", "sr", "sv", "sw",
  "ta", "te", "th", "tr", "uk", "vi", "zh", "zh_CN", "zh_TW"];

var Util = {
  ajax: function(callback, url) {
    var req = new XMLHttpRequest();
    req.open('GET', url, true);
    req.onreadystatechange = function() {
      if(req.readyState == 4) {
        callback(req.status, req.responseText, req);
      }
    };
    req.send();
  },
  isEmptyObject: function(obj) {
    for(var p in obj) {
      return false;
    }
    return true;
  }
};

LocaleTable.instance = new LocaleTable();

chrome.i18n.originalGetMessage = chrome.i18n.getMessage;
chrome.i18n.safeGetMessage = function() {
  try {
    return chrome.i18n.originalGetMessage.apply(chrome.i18n, arguments);
  } catch(e) {
    console.warn(e, e.stack);
  }
  return arguments[0];
}
chrome.i18n.getMessage = function(message, params) {
  if(params) {
    if(params.forEach && params.splice) {
      for(var i = 0, len = params.length; i < len; ++i) {
        var p = String(params[i]);
        p = p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        params[i] = p;
      }
    } else {
      params = String(params);
      params = params.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  }
  var newDefaultLocale = OptionsBackend.get('default_locale');
  if(!LocaleTable.instance.ready || newDefaultLocale === 'auto') {
    return chrome.i18n.safeGetMessage(message, params);
  }
  var localeObj = LocaleTable.instance.locales[newDefaultLocale];
  if(!localeObj) {
    return chrome.i18n.safeGetMessage(message, params);
  }
  var messageData = localeObj[message];
  if(!messageData) {
    return chrome.i18n.safeGetMessage(message, params);
  }
  var messageStr = messageData.message;
  if(messageData.parsedPlaceholders) {
    for(var i = 0, len = messageData.parsedPlaceholders.length; i < len; ++i) {
      var placeholder = messageData.parsedPlaceholders[i];
      messageStr = messageStr.replace(placeholder.key, params[placeholder.position]);
    }
  }
  return messageStr;
};