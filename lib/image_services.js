var UploadManager = {
  upload: function(file) {
    this.running = true;
    this.finishedResponse = null;
    this.lastProgress = null;
    var imageService = ImageService.getService(OptionsBackend.get('image_upload_service'));
    var _this = this;
    imageService.upload(file, function(success, urlOrError) {
      _this.running = false;
      if(!_this.onFinish || !_this.onFinish(success, urlOrError)) {
        _this.finishedResponse = {
          success: success,
          urlOrError: urlOrError
        };
        _this.onFinish = null;
      }
    },
    function(loaded, total) {
      if(!_this.onProgress || !_this.onProgress(loaded, total)) {
        _this.lastProgress = {
          loaded: loaded,
          total: total
        };
        _this.onProgress = null;
      }
    });
  },

  registerCallbacks: function(onFinish, onProgress) {
    this.onFinish = onFinish;
    this.onProgress = onProgress;

    if(this.finishedResponse) {
      onFinish(this.finishedResponse.success, this.finishedResponse.urlOrError);
      this.finishedResponse = null;
      return false;
    }
    if(this.running) {
      if(this.lastProgress) {
        this.onProgress(this.lastProgress.loaded, this.lastProgress.total);
      }
      return true;
    }
    return false;
  }
};

function ImageService(domain, options) {
  this.domain = domain;
  if(typeof options.thumb == 'function') {
    this.thumbFunc = options.thumb;
  } else {
    this.thumbUrl = options.thumb;
  }

  if(options.upload) {
    this.uploadOptions = $.extend(true, {}, ImageService.defaultUploadOptions, options.upload);
  }

  this.getThumb = function(url) {
    var urlMatch = url.match(/(https?:\/\/|www\.)(.*?)\/(.*)$/i);
    var domain = urlMatch[2];
    var path = urlMatch[3];
    if(this.domain == domain) {
      if(this.thumbFunc) {
        return this.thumbFunc(path, url);
      }
      return this.thumbUrl.replace('$1', path).replace('$2', url);
    }
    return null;
  };

  this.hasUpload = function() {
    return !!this.uploadOptions;
  };

  this.upload = function(file, onFinish, onProgress) {
    var xhr = new XMLHttpRequest();
    xhr.open('post', this.uploadOptions.url, true);

    var _this = this;
    xhr.onreadystatechange = function() {
      if (this.readyState != 4) {
        return;
      }
      if(xhr.status == 200 && xhr.responseText) {
        var parsedResponse = null;
        if(_this.uploadOptions.dataType == 'json') {
          try {
            parsedResponse = JSON.parse(xhr.responseText);
          } catch(e) {}
        } else if(_this.uploadOptions.dataType == 'xml') {
          try {
            parsedResponse = $(xhr.responseText);
          } catch(e) {}
        }
        if(parsedResponse) {
          onFinish(true, _this.uploadOptions.parseSuccess(parsedResponse, xhr));
          return;
        }
      }
      onFinish(false, _this.uploadOptions.parseError(xhr));
    };

    TweetManager.instance.twitterBackend.signOauthEcho(xhr, this.uploadOptions.signingUrl);

    var formData = new FormData();
    for(var param in this.uploadOptions.params) {
      var paramValue = this.uploadOptions.params[param];
      if(paramValue == '$file') {
        paramValue = file;
      }
      formData.append(param, paramValue);
    }

    if(onProgress) {
      xhr.upload.addEventListener("progress", function(e) {
        onProgress(e.loaded, e.total);
      }, false);
    }

    xhr.send(formData);
  };
}

$.extend(ImageService, {
  addService: function(domain, options) {
    this.services = this.services || [];
    this.servicesMap = this.servicesMap || {};
    var service = new ImageService(domain, options);
    this.services.push(service);
    this.servicesMap[domain] = service;
  },

  getThumb: function(url) {
    for(var i = 0, len = this.services.length; i < len; ++i) {
      var service = this.services[i];
      var thumbUrl = service.getThumb(url);
      if(thumbUrl) {
        return thumbUrl;
      }
    }
    return null;
  },

  getService: function(serviceName) {
    return this.servicesMap[serviceName];
  },

  defaultUploadOptions: {
    url: '', // Mandatory
    signingUrl: 'https://api.twitter.com/1/account/verify_credentials.json',
    params: {
      media: '$file'
    },
    dataType: 'json',
    parseError: null, // Mandatory
    parseSuccess: null // Mandatory
  }
});

// $1 is the remaining url after the server and domain name, $2 is the full original url
ImageService.addService('twitpic.com', {
  thumb: 'http://twitpic.com/show/thumb/$1',
  upload: {
    url: 'http://api.twitpic.com/2/upload.json',
    params: {
      key: SecretKeys.twitpic.key
    },
    parseError: function(xhr) {
      var formattedErr;
      if(xhr.responseText) {
        formattedErr = '';
        var errorObj = JSON.parse(xhr.responseText);
        for(var i = 0, len = errorObj.errors.length; i < len; ++i) {
          var error = errorObj.errors[i];
          formattedErr += error.code + ': ' + error.message;
          if(i > 0) {
            formattedErr += '<br>';
          }
        }
      } else {
        formattedErr = 'Error code: ' + xhr.status;
      }
      return formattedErr;
    },
    parseSuccess: function(obj, xhr) {
      return obj.url;
    }
  }
});

ImageService.addService('yfrog.com', {
 thumb: 'http://yfrog.com/$1.th.jpg',
 upload: {
   url: 'https://yfrog.com/api/xauth_upload',
   params: {
     key: SecretKeys.yfrog.key
   },
   parseError: function(xhr) {
     var errXml = $('err', xhr.responseText);
     var errorStr = 'Error ' + errXml.attr('code') + ': ' + errXml.attr('msg');
     return errorStr;
   },
   parseSuccess: function(obj, xhr) {
     return obj.rsp.mediaurl;
   }
 }
});

ImageService.addService('pict.mobi', {
  thumb: 'http://pict.mobi/show/thumb/$1',
  upload: {
    url: 'http://pict.mobi/upload/',
    dataType: 'xml',
    parseError: function(xhr) {
      return 'Undefined error while uploading.';
    },
    parseSuccess: function(obj, xhr) {
      return obj.text();
    }
  }
});

ImageService.addService('twitshoot.com', {
  thumb: 'http://twitshoot.com/show/thumb/$1',
  upload: {
    url: 'http://twitshoot.com/api/upload.json',
    parseError: function(xhr) {
      return "The upload has failed.";
    },
    parseSuccess: function(obj, xhr) {
		  return obj.image.mediaurl;
    }
  }
});

ImageService.addService('i.imgur.com', {
  thumb: function(path) { return 'http://i.imgur.com/' + path.split('.')[0] + 's.' + path.split('.')[1]; }
});

ImageService.addService('movapic.com', {
  thumb: function(path) { return 'http://image.movapic.com/pic/t_' + path.split('/')[1] + '.jpeg'; }
});
ImageService.addService('tweetphoto.com', {
  thumb: 'http://TweetPhotoAPI.com/api/TPAPI.svc/imagefromurl?url=$2'
});
