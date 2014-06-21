var ImageEditor = function (options) {
  this.$el = options.$el;
  var disabled = true;
  var $fileInput = this.$('input[name="image"]');
  var $hiddenImage = this.$('.image-hidden-preview');
  var $imageSize = this.$('.image-size');
  var $offsetX = this.$('input[name="offset_x"]');
  var $offsetY = this.$('input[name="offset_y"]');

  var initialZoomVal = 0;

  var lastZoom = Number($imageSize.val());

  var imageSize;

  var $bg = $('.image-preview');
  var bgSize = {
    w: $bg.innerWidth(),
    h: $bg.innerHeight()
  };

  var origin = { x: 0, y: 0 };
  var start = { x: 0, y: 0 };
  var movecontinue = false;

  function move (e) {
    if (movecontinue) {
      var offset = {
        x: start.x + e.clientX - origin.x,
        y: start.y + e.clientY - origin.y
      };

      if (offset.x > 0) {
        offset.x = 0;
      } else if (offset.x + imageSize.w * lastZoom < bgSize.w) {
        offset.x = bgSize.w - imageSize.w * lastZoom;
      }
      if (offset.y > 0) {
        offset.y = 0;
      } else if (offset.y + imageSize.h * lastZoom < bgSize.h) {
        offset.y = bgSize.h - imageSize.h * lastZoom;
      }

      start.x = offset.x;
      start.y = offset.y;

      updateImagePosition(start);
    }

    origin.x = e.clientX;
    origin.y = e.clientY;

    e.stopPropagation();
    return false;
  }

  function handle (e) {
    if (disabled) {
      return;
    }
    movecontinue = false;
    $bg.unbind('mousemove', move);

    if (e.type == 'mousedown') {
      origin.x = e.clientX;
      origin.y = e.clientY;
      movecontinue = true;
      $bg.bind('mousemove', move);
    } else {
      $(document.body).focus();
    }

    e.stopPropagation();
    return false;
  }

  function reset () {
    start = { x: 0, y: 0 };
    updateImagePosition(start);
  }

  $bg.bind('mousedown mouseup mouseleave', handle);
  $bg.bind('dblclick', reset);

  //read image locally
  $fileInput.on('change', function () {
    var oFReader = new FileReader();
    var file = $fileInput.get(0).files[0];
    oFReader.readAsDataURL(file);
    oFReader.onload = function (oFREvent) {
      $bg.css('background-image', 'url(' + oFREvent.target.result + ')');
      $hiddenImage.attr('src', oFREvent.target.result);

      imageSize = {
        w: $hiddenImage.width(),
        h: $hiddenImage.height()
      };

      Zoom.setup(imageSize, bgSize);

      $imageSize.val(initialZoomVal);
      lastZoom = Zoom.get(initialZoomVal);

      updateImage();

      $bg.addClass('with-cursor');

      disabled = false;
    };
  });

  var updateImage = function() {
    var val = Number($imageSize.val());
    if (imageSize && imageSize.w && imageSize.h) {
      var zoom = Zoom.get(val);
      var updatedWidth = Math.round(imageSize.w * zoom);
      var updatedHeight = Math.round(imageSize.h * zoom);

      $bg.css({
        'background-size': updatedWidth + 'px ' + updatedHeight + 'px'
      });

      var x, y;
      x = parseInt($bg.css('background-position-x'), 10);
      y = parseInt($bg.css('background-position-y'), 10);

      var oldZoom = lastZoom;
      var newZoom = zoom;


      var newX = (x / oldZoom * newZoom + bgSize.w / 2) - bgSize.w / 2 / oldZoom * newZoom;
      var newY = (y / oldZoom * newZoom + bgSize.h / 2) - bgSize.h / 2 / oldZoom * newZoom;

      start = { x: newX, y: newY };

      updateImagePosition(start);

      lastZoom = zoom;
    }
  };

  var updateImagePosition = function(position) {
    $bg.css('background-position', position.x + 'px ' + position.y + 'px');
    $offsetX.val(Math.round(position.x));
    $offsetY.val(Math.round(position.y));
  };

  $imageSize.on('change', updateImage);

  var Zoom = (function () {
    var minZoom;
    var maxZoom;

    return {
      setup: function(imageSize, bgSize) {
        var widthRatio = bgSize.w / imageSize.w;
        var heightRatio = bgSize.h / imageSize.h;
        minZoom = widthRatio > heightRatio ? widthRatio : heightRatio;

        maxZoom = minZoom < 1 ? 1 : minZoom;
      },

      get: function(val) {
        return val * (maxZoom - minZoom) + minZoom;
      }
    };
  })();
};

ImageEditor.prototype.$ = function (selector) {
  return this.$el.find(selector);
};