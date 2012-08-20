var ImageUpload = {
  init: function() {
    var _this = this;
    this.progressEl = $('#upload_progress');
    this.loadingEl = $('#loading');
    this.inputEl = $('#image_input')[0];

    // FIXME: This check is here only because of http://crbug.com/61632
    var hideButton = false;
    if(ThemeManager.isPopup) {
      var matchGroup = navigator.userAgent.match(/\((\w+);/);
      if(matchGroup && matchGroup.length > 1) {
        var platform = matchGroup[1];
        if(platform == 'Macintosh') {
          hideButton = true;
        }
      }
    }
    if(hideButton) {
      $('#upload_button_area').hide();
    }

    var running = UploadManager.registerCallbacks(
      function (success, urlOrError) {
        return _this.onFinish(success, urlOrError);
      },
      function (loaded, total) {
        return _this.onProgress(loaded, total);
      }
    );
    if(running) {
      this.inputEl.disabled = true;
      this.progressEl.show();
      this.loadingEl.show();
    }
  },

  upload: function() {
    this.inputEl.disabled = true;
    this.progressEl.show();
    this.loadingEl.show();

    var files = this.inputEl.files;
    UploadManager.upload(files[0]);
  },

  onFinish: function(success, urlOrError) {
    if(!window) {
      return false;
    }
    this.inputEl.disabled = false;
    this.progressEl.hide();
    this.loadingEl.hide();
    if(success) {
      this.inputEl.value = null;
      Composer.addText(urlOrError);
    } else {
      Renderer.showError(urlOrError, ImageUpload.upload.bind(ImageUpload));
    }
    return true;
  },

  onProgress: function(loaded, total) {
    if(!window) {
      return false;
    }
    var progress = (loaded / total) * 100.0;
    this.progressEl[0].value = progress;
    return true;
  }
};
