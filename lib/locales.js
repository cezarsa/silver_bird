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

  loadLocaleMessages: function(callback) {
    var remainingLocalesMap = {};
    for(var k = 0, codesLen = LocaleTable.availableLocaleCodes.length; k < codesLen; ++k) {
      remainingLocalesMap[LocaleTable.availableLocaleCodes[k]] = true;
    }
    var locales = {};
    var updateLocaleCallback = function(localeCode, data) {
      delete remainingLocalesMap[localeCode];
      if(data) {
        locales[localeCode] = data;
      }
      if(Util.isEmptyObject(remainingLocalesMap)) {
        callback(locales);
      }
    };
    var _this = this;
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
LocaleTable.availableLocaleCodes = ["am", "ar", "bg", "bn", "ca", "cs", "da", "de", "el", "en", "en_GB", "en_US", "es",
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
chrome.i18n.getMessage = function(message, params) {
  var newDefaultLocale = OptionsBackend.get('default_locale');
  if(!LocaleTable.instance.ready || newDefaultLocale === 'auto') {
    return chrome.i18n.originalGetMessage(message, params);
  }
  var localeObj = LocaleTable.instance.locales[newDefaultLocale];
  if(!localeObj) {
    return chrome.i18n.originalGetMessage(message, params);
  }
  var messageData = localeObj[message];
  if(!messageData) {
    return chrome.i18n.originalGetMessage(message, params);
  }
  var messageStr = messageData.message;
  if(messageData.placeholders) {
    for(var key in messageData.placeholders) {
      var placeholder = messageData.placeholders[key];
      var position = parseInt(placeholder.content.substring(1), 10) - 1;
      messageStr = messageStr.replace('$' + key + '$', params[position]);
    }
  }
  //TODO: string substitution
  return messageStr;
};