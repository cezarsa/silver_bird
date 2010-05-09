(function($) {
    function fixTitle($ele) {
        if ($ele.attr('title') || typeof($ele.attr('original-title')) != 'string') {
            $ele.attr('original-title', $ele.attr('title') || '').removeAttr('title');
        }
    }

    function showTip() {
        var self = this;
        var opts = $(this).data('tipsy_opts');
        var showFunc = function() {
            $.data(self, 'cancel.tipsy', true);

            var tip = $.data(self, 'active.tipsy');
            if (!tip) {
                tip = $('<div class="tipsy"><div class="tipsy-inner"/></div>');
                tip.css({position: 'absolute', zIndex: 100000});
                $.data(self, 'active.tipsy', tip);
            }

            fixTitle($(self));

            var title;
            if (typeof opts.title == 'string') {
                title = $(self).attr(opts.title == 'title' ? 'original-title' : opts.title);
            } else if (typeof opts.title == 'function') {
                title = opts.title.call(self);
            }
            if (opts.maxWidth) {
              tip.find('.tipsy-inner').css({maxWidth: opts.maxWidth});
            }

            var imageUrl = opts.image;
            if(imageUrl) {
              var currentContents = tip.find('.tipsy-inner').html();
              if(!currentContents || currentContents.length == 0) {
                tip.find('.tipsy-inner')[opts.html ? 'html' : 'text'](title || opts.fallback);
                var img = new Image();
                img.onload = function() {
                  tip.find('.tipsy-inner').html('').append(img);
                  var curPos = tip.offset();
                  tip.css({top: curPos.top - ($(img).height() / 2) + 6});
                };
                img.src = imageUrl;
              }
            } else if(title) {
              tip.find('.tipsy-inner')[opts.html ? 'html' : 'text'](title || opts.fallback);
            }

            var pos = $.extend({}, $(self).offset(), {width: self.offsetWidth, height: self.offsetHeight});
            tip.get(0).className = 'tipsy'; // reset classname in case of dynamic gravity
            tip.remove().css({top: 0, left: 0, visibility: 'hidden', display: 'block'}).appendTo(document.body);
            var actualWidth = tip[0].offsetWidth, actualHeight = tip[0].offsetHeight;
            var gravity = (typeof opts.gravity == 'function') ? opts.gravity.call(self) : opts.gravity;

            switch (gravity) {
                case 'n':
                    tip.css({top: pos.top + pos.height, left: pos.left + pos.width / 2 - actualWidth / 2}).addClass('tipsy-north');
                    break;
                case 's':
                    tip.css({top: pos.top - actualHeight, left: pos.left + pos.width / 2 - actualWidth / 2}).addClass('tipsy-south');
                    break;
                case 'e':
                    tip.css({top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left - actualWidth}).addClass('tipsy-east');
                    break;
                case 'w':
                    tip.css({top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left + pos.width}).addClass('tipsy-west');
                    break;
                case 'tasks':
                    var top = pos.top + pos.height / 2 - actualHeight / 2;
                    var left = pos.left - actualWidth;
                    var bgPosY = -(250 - actualHeight / 2);
                    if(top < 0) {
                      bgPosY += top;
                      top = 0;
                    }
                    tip.css({top: top, left: left, backgroundPosition: 'right ' + bgPosY + 'px' });
                    break;
            }

            if(opts.persistOnHover) {
              $(tip).hover(function() {
                showTip.call(self);
              }, function() {
                hideTip.call(self);
              });
            }

            if (opts.fade) {
                tip.stop().css({opacity: 0, display: 'block', visibility: 'visible'}).animate({opacity: opts.opacity});
            } else {
                tip.css({visibility: 'visible', opacity: opts.opacity});
            }
        };
        if(opts.delayIn == 0 || opts.showNow) {
            showFunc();
        } else {
          var timeout = setTimeout(function() {
              showFunc.call(self);
          }, opts.delayIn);
          $(this).data('tipsy_timeout', timeout);
        }
    }

    function hideTip() {
        var opts = $(this).data('tipsy_opts');
        var timeout = $(this).data('tipsy_timeout');
        $.data(this, 'cancel.tipsy', false);
        var self = this;
        if(timeout) {
          clearTimeout(timeout);
        }
        var hideFunc = function() {
            if ($.data(this, 'cancel.tipsy')) return;
            var tip = $.data(self, 'active.tipsy');
            if (opts.fade) {
                tip.stop().fadeOut(function() { $(this).remove(); });
            } else if (tip) {
                tip.remove();
            }
        };
        if(opts.delayOut == 0 || opts.hideNow) {
          hideFunc();
        } else {
          setTimeout(function() {
              hideFunc.call(self);
          }, opts.delayOut);
        }
    }

    $.fn.tipsy = function(options) {

        options = $.extend({}, $.fn.tipsy.defaults, options);

        return this.each(function() {

            if(options.refresh) {
              showTip.call(this);
              return;
            }

            fixTitle($(this));
            var newOpts = $.fn.tipsy.elementOptions(this, options);
            $(this).data('tipsy_opts', newOpts);
            if(!$(this).data('tipsyed')) {
                $(this).data('tipsyed', true);

                $(this).hover(function() {
                  showTip.call(this);
                }, function() {
                  hideTip.call(this);
                });
            }

            if(newOpts.hideNow) {
              hideTip.call(this);
              $(this).unbind('mouseenter mouseleave');
              return
            }
            if(newOpts.showNow || $(this).data('cancel.tipsy')) {
              showTip.call(this);
            }
        });

    };

    // Overwrite this method to provide options on a per-element basis.
    // For example, you could store the gravity in a 'tipsy-gravity' attribute:
    // return $.extend({}, options, {gravity: $(ele).attr('tipsy-gravity') || 'n' });
    // (remember - do not modify 'options' in place!)
    $.fn.tipsy.elementOptions = function(ele, options) {
        return $.metadata ? $.extend({}, options, $(ele).metadata()) : options;
    };

    $.fn.tipsy.defaults = {
        delayIn: 0,
        delayOut: 100,
        fade: false,
        fallback: '',
        gravity: 'n',
        html: false,
        opacity: 0.8,
        title: 'title',
        showNow: false,
        hideNow: false
    };

    $.fn.tipsy.autoNS = function() {
        return $(this).offset().top > ($(document).scrollTop() + $(window).height() / 2) ? 's' : 'n';
    };

    $.fn.tipsy.autoWE = function() {
        return $(this).offset().left > ($(document).scrollLeft() + $(window).width() / 2) ? 'e' : 'w';
    };

})(jQuery);