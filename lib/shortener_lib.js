function Shortener(backendId, useAcct, login, apiKey, serviceUrl) {
  if(!backendId) {
    backendId = 'bitly';
  }
  this.useAcct = useAcct;
  if(useAcct || backendId == 'yourls') {
    this.login = login;
    this.apiKey = apiKey;
  }
  this.serviceUrl = serviceUrl;
  this.shortenerInfo = SHORTENERS_BACKEND[backendId];
}
Shortener.prototype = {
  shorten: function(longUrl, callback) {
    var _this = this;
      this.shortenerInfo.backend.shorten(longUrl, this.useAcct, this.login, this.apiKey, this.serviceUrl,
        function(errorCode, msg) {
      var cbMsg = null;
      var success = true;
      if(errorCode === 0 && msg) {
        cbMsg = _this.shortenerInfo.baseUrl + msg;
      } else if(errorCode !== 0 && msg) {
        cbMsg = 'Error ' + errorCode + ': ' + msg;
        success = false;
      } else {
        cbMsg = 'Unknown Error';
        success = false;
      }
      callback(success, cbMsg);
    });
  }
};

BitLyShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var url = "http://api.bit.ly/shorten";
    var params = {
      version: '2.0.1',
      format: 'json',
      longUrl: longUrl
    };
    if(useAcct) {
      params['login'] = login;
      params['apiKey'] = apiKey;
      params['history'] = 1;
    } else {
      params['login'] = 'chromedbird';
      params['apiKey'] = 'R_aa77c64a8258cf704e7fa361555a4d81';
    }

    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'json',
      success: function(data, status) {
        var ecAPI = data.errorCode;
        if(ecAPI === 0) {
          var ecURL = data.results[longUrl].errorCode;
          if(!ecURL || ecURL === 0) {
            callback(0, data.results[longUrl].userHash);
          } else {
            callback(ecURL, data.results[longUrl].errorMessage);
          }
        } else {
          callback(ecAPI, data.errorMessage);
        }
      },
      error: function (request, status, error) {
        callback(-1, chrome.i18n.getMessage("ajaxFailed"));
      }
    });
  }
};

TrimShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var url = "http://api.tr.im/v1/trim_url.json";
    var params = {
      url: longUrl
    };
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'json',
      success: function(data, status) {
        if(data.status.result != 'OK') {
          callback(data.status.code, data.status.message);
          return;
        }
        callback(0, data.trimpath);
      },
      error: function (request, status, error) {
        callback(-1, chrome.i18n.getMessage("ajaxFailed"));
      }
    });
  }
};

MigremeShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var url = "http://migre.me/api.json";
    var params = {
      url: longUrl
    };
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'json',
      success: function(data, status) {
        if(!data.id) {
          callback(-1, data.info);
          return;
        }
        callback(0, data.id);
      },
      error: function (request, status, error) {
        callback(-1, chrome.i18n.getMessage("ajaxFailed"));
      }
    });
  }
};

IsGdShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var url = "http://is.gd/api.php";
    var params = {
      longurl: longUrl
    };
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'text',
      success: function(data, status) {
        if(data.match(/^ERROR/i)) {
          callback(-1, data);
          return;
        }
        callback(0, data);
      },
      error: function (request, status, error) {
        callback(-1, chrome.i18n.getMessage("ajaxFailed"));
      }
    });
  }
};

MiudinShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var url = "http://miud.in/api-create.php";
    var params = {
      url: longUrl
    };
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'text',
      success: function(data, status) {
        callback(0, data);
      },
      error: function (request, status, error) {
        callback(-1, chrome.i18n.getMessage("ajaxFailed"));
      }
    });
  }
};

UdanaxShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var url = "http://udanax.org/shorturl.jsp";
    var params = {
      mode: 'api',
      longurl: longUrl
    };
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      jsonp: 'jsoncallback',
      dataType: 'jsonp',
      success: function(data, status) {
        callback(0, data.shorturl);
      },
      error: function (request, status, error) {
        callback(-1, chrome.i18n.getMessage("ajaxFailed"));
      }
    });
  }
};

URLinlShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var url = "http://urli.nl/api.php";
    var params = {
      format: 'json',
      action: 'shorturl',
      url: longUrl
    };
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'json',
      success: function(data, status) {
        if(data && data.status && data.status == 'success') {
          callback(0, data.url.keyword);
        } else {
          callback(data.statusCode, data.message);
        }
      },
      error: function (request, status, error) {
        callback(-1, chrome.i18n.getMessage("ajaxFailed"));
      }
    });
  }
};

URLcortaShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var url = "http://urlcorta.es/api/text/";
    var params = {
      url: longUrl
    };
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'text',
      success: function(data, status) {
        callback(0, data);
      },
      error: function (request, status, error) {
        callback(-1, chrome.i18n.getMessage("ajaxFailed"));
      }
    });
  }
};

GooglShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var authFunc = function(f){function k(){for(var c=0,b=0;b<arguments.length;b++)c=c+arguments[b]&4294967295;return c}function m(c){c=c=String(c>0?c:c+4294967296);var b;b=c;for(var d=0,i=false,j=b.length-1;j>=0;--j){var g=Number(b.charAt(j));if(i){g*=2;d+=Math.floor(g/10)+g%10}else d+=g;i=!i}b=b=d%10;d=0;if(b!=0){d=10-b;if(c.length%2==1){if(d%2==1)d+=9;d/=2}}b=String(d);b+=c;return b}function n(c){for(var b=5381,d=0;d<c.length;d++)b=k(b<<5,b,c.charCodeAt(d));return b}function o(c){for(var b=0,d=0;d<c.length;d++)b=k(c.charCodeAt(d),b<<6,b<<16,-b);return b}f={byteArray_:f,charCodeAt:function(c){return this.byteArray_[c]}};f.length=f.byteArray_.length;var e=n(f.byteArray_);e=e>>2&1073741823;e=e>>4&67108800|e&63;e=e>>4&4193280|e&1023;e=e>>4&245760|e&16383;var l="7";f=o(f.byteArray_);var h=(e>>2&15)<<4|f&15;h|=(e>>6&15)<<12|(f>>8&15)<<8;h|=(e>>10&15)<<20|(f>>16&15)<<16;h|=(e>>14&15)<<28|(f>>24&15)<<24;l+=m(h);return l};
    var url = 'http://goo.gl/api/url';
    var params = {
      user: 'toolbar@google.com',
      url: longUrl,
      auth_token: authFunc(longUrl)
    };
    $.ajax({
      url: url,
      type: 'post',
      data: params,
      dataType: 'json',
      success: function(data, status) {
        callback(0, data.short_url);
      },
      error: function (request, status, error) {
        var errMsg;
        try {
          var rspObj = JSON.parse(request.responseText);
          errMsg = rspObj.error_message;
        } catch(e) {
          errMsg = chrome.i18n.getMessage("ajaxFailed");
        }
        callback(-1, errMsg);
      }
    });
  }
};

KCYShortener = {
  shorten : function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var url = 'http://kcy.me/api/';
    var params = {
      url: longUrl,
      u: login,
      key: apiKey
    };
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'text',
      success: function(data, status) {
        var errorCode = -1;
        if(data.match(/^http/i)) {
          errorCode = 0;
        }
        callback(errorCode, data);
      },
      error: function (request, status, error) {
        callback(-1, chrome.i18n.getMessage("ajaxFailed"));
      }
    });
  }
};

YourlsShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var params = {
      signature: apiKey,
      action:  'shorturl',
      format: 'json',
      url: longUrl
    };

    $.ajax({
      type: 'GET',
      url: serviceUrl,
      data: params,
      dataType: 'json',
      success: function(data, status) {
        if(data && data.status && data.shorturl) {
          callback(0, data.shorturl);
        } else {
          callback(-1, data.message);
        }
      },
      error: function (request, status, error) {
        callback(-1,'AJAX request failed (bad connection?)');
      }
    });
  }
};

McafeeShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var url = "http://mcaf.ee/api/shorten";
    var params = {
      input_url: longUrl,
      format: 'json'
    };
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'json',
      success: function(data, status) {
        if(!data) {
          callback(-1, chrome.i18n.getMessage("ajaxFailed"));
        }
        if(data.status_code == 200 && data.data) {
          callback(0, data.data.url);
        } else {
          callback(data.status_code, data.status_txt);
        }
      },
      error: function (request, status, error) {
        callback(-1, chrome.i18n.getMessage("ajaxFailed"));
      }
    });
  }
};

RodGsShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var url = "http://rod.gs/";
    var params = {
      longurl: longUrl
    };
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'text',
      success: function(data, status) {
        if(data.match(/^ERROR/i)) {
          callback(-1, data);
          return;
        }
        callback(0, data);
      },
      error: function (request, status, error) {
        callback(-1, chrome.i18n.getMessage("ajaxFailed"));
      }
    });
  }
};

MinifyShortener = {
  shorten: function(longUrl, useAcct, login, apiKey, serviceUrl, callback) {
    var url = "http://minify.us/api.php";
    var params = {
      u: longUrl
    };
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'text',
      success: function(data, status) {
        if(data.match(/^ERROR/i)) {
          callback(-1, data);
          return;
        }
        callback(0, data);
      },
      error: function (request, status, error) {
        callback(-1, chrome.i18n.getMessage("ajaxFailed"));
      }
    });
  }
};

SHORTENERS_BACKEND = {
  bitly: {
    desc: 'bit.ly',
    baseUrl: 'http://bit.ly/',
    backend: BitLyShortener
  },
  jmp: {
    desc: 'j.mp',
    baseUrl: 'http://j.mp/',
    backend: BitLyShortener
  },
  trim: {
    desc: 'tr.im',
    baseUrl: 'http://tr.im/',
    backend: TrimShortener
  },
  isgd: {
    desc: 'is.gd',
    baseUrl: '',
    backend: IsGdShortener
  },
  migreme: {
    desc: 'migre.me',
    baseUrl: 'http://migre.me/',
    backend: MigremeShortener
  },
  miudin: {
    desc: 'miud.in',
    baseUrl: '',
    backend: MiudinShortener
  },
  udanax: {
    desc: 'udanax.org',
    baseUrl: 'http://udanax.org/',
    backend: UdanaxShortener
  },
  urlinl: {
    desc: 'URLi.nl',
    baseUrl: 'http://urli.nl/',
    backend: URLinlShortener
  },
  urlcorta: {
    desc: 'URLcorta.es',
    baseUrl: '',
    backend: URLcortaShortener
  },
  googl: {
    desc: 'goo.gl',
    baseUrl: '',
    backend: GooglShortener
  },
  karmacracy: {
    desc: 'karmacracy.com',
    baseUrl: '',
    backend: KCYShortener
  },
  yourls: {
    desc: 'yourls',
    baseUrl: '',
    backend: YourlsShortener
  },
  mcafee: {
    desc: 'mcaf.ee',
    baseUrl: '',
    backend: McafeeShortener
  },
  rodgs: {
    desc: 'rod.gs',
    baseUrl: '',
    backend: RodGsShortener
  },
  minify: {
    desc: 'minify',
    baseUrl: '',
    backend: MinifyShortener
  }
};
