ImageServices = {
  addService: function(domainOrService, thumbUrl) {
    this.services = this.services || [];
    var service = (domainOrService instanceof ImageService) ? domainOrService : new ImageService(domainOrService, thumbUrl);
    this.services.push(service);
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
  }
};

function ImageService(domain, thumbUrl, uploadCB) {
  this.domain = domain;
  this.thumbUrl = thumbUrl;
  this.upload = uploadCB;
  if(typeof this.thumbUrl == 'function') {
    this.thumbFunc = this.thumbUrl;
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
}

// $1 is the remaining url after the server and domain name, $2 is the full original url
ImageServices.addService('twitgoo.com',     'http://twitgoo.com/show/thumb/$1');
ImageServices.addService('yfrog.com',       'http://yfrog.com/$1.th.jpg');
ImageServices.addService('movapic.com',     function(path) { return 'http://image.movapic.com/pic/t_' + path.split('/')[1] + '.jpeg'; });
ImageServices.addService('tweetphoto.com',  'http://TweetPhotoAPI.com/api/TPAPI.svc/imagefromurl?url=$2');
ImageServices.addService('pict.mobi',       'http://pict.mobi/show/thumb/$1');

ImageServices.twitpic = new ImageService('twitpic.com', 'http://twitpic.com/show/thumb/$1', function(file, finishedCallback, progressCallback) {
  var xhr = new XMLHttpRequest();
  xhr.open('post', 'http://api.twitpic.com/2/upload.json', true);

  xhr.onreadystatechange = function() {
    if (this.readyState != 4) {
      return;
    }
    if(xhr.status != 200 || !xhr.responseText) {
      var formattedErr = '';
      try {
        var errorObj = JSON.parse(xhr.responseText);
        for(var i = 0, len = errorObj.errors.length; i < len; ++i) {
          var error = errorObj.errors[i];
          formattedErr += error.code + ': ' + error.message;
          if(i > 0) {
            formattedErr += '<br>';
          }
        }
      } catch(e) {
        formattedErr += 'Error code: ' + xhr.status;
      }
      finishedCallback(null, formattedErr);
      return;
    }
    finishedCallback(JSON.parse(xhr.responseText).url);
  };

  TweetManager.instance.twitterBackend.signOauthEcho(xhr);

  var formData = new FormData();
  formData.append('key', '304318d9f93d61f0403593d98731ca80');
  formData.append('media', file);

  if(progressCallback) {
    xhr.upload.addEventListener("progress", function(e) {
      progressCallback(e.loaded, e.total);
    }, false);
  }

  xhr.send(formData);
});
ImageServices.addService(ImageServices.twitpic);