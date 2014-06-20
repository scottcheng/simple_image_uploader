var ImageEditor = function (options) {
  var width = options.width;
  var height = options.height;
  this.$el = options.$el;
  var disabled = true;
  var $fileInput = this.$('input[name="image"]');
  var $hiddenImage = this.$('.image-hidden-preview');
  var $imageSize = this.$('.image-size');
  var $offsetX = this.$('input[name="offset_x"]');
  var $offsetY = this.$('input[name="offset_y"]');

  var lastZoom = Number($imageSize.val());

  // Stuff for generating preview and dragging
  var $bg = $('.image-preview'),
    elbounds = {
      w: parseInt($bg.width()),
      h: parseInt($bg.height())
    },
    bounds = {w: 2350 - elbounds.w, h: 1750 - elbounds.h},
    origin = {x: 0, y: 0},
    start = {x: 0, y: 0},
    movecontinue = false;

  function move (e){
    var inbounds = {x: false, y: false};
    var offset = {
      x: start.x - (origin.x - e.clientX),
      y: start.y - (origin.y - e.clientY)
    };

    inbounds.x = offset.x < 0 && (offset.x * -1) < bounds.w;
    inbounds.y = offset.y < 0 && (offset.y * -1) < bounds.h;

    if (movecontinue && inbounds.x && inbounds.y) {
      start.x = offset.x;
      start.y = offset.y;

      $(this).css('background-position', start.x + 'px ' + start.y + 'px');
      $offsetX.val(Math.round(start.x));
      $offsetY.val(Math.round(start.y));
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
    start = {x: 0, y: 0};
    $(this).css('backgroundPosition', '0 0');
  }

  $bg.bind('mousedown mouseup mouseleave', handle);
  $bg.bind('dblclick', reset);

  //read image locally
  var imageHeight, imageWidth;
  $fileInput.on('change', function () {
    var oFReader = new FileReader();
    var file = $fileInput.get(0).files[0];
    oFReader.readAsDataURL(file);
    oFReader.onload = function (oFREvent) {
      $bg.css('background-image', 'url(' + oFREvent.target.result + ')');
      $hiddenImage.attr('src', oFREvent.target.result);

      var bgHeight = $bg.height();
      var bgWidth = $bg.width();
      imageHeight = $hiddenImage.height();
      imageWidth = $hiddenImage.width();

      Zoom.setup(
        { width: imageWidth, height: imageHeight },
        { width: bgWidth, height: bgHeight });

      $imageSize.val(0);
      lastZoom = 0;

      var widthOffset = 0;
      var heightOffset = 0;

      updateImage();

      $bg.addClass('with-cursor');

      disabled = false;
    };
  });

  $imageSize.on('change', updateImage);

  var updateImage = function() {
    var val = Number($imageSize.val());
    if (imageHeight && imageWidth) {
      var zoom = Zoom.get(val);
      var updatedWidth = Math.round(imageWidth * zoom);
      var updatedHeight = Math.round(imageHeight * zoom);

      $bg.css({
        'background-size': updatedWidth + 'px ' + updatedHeight + 'px'
      });

      var x, y;
      x = parseInt($bg.css('background-position-x'), 10);
      y = parseInt($bg.css('background-position-y'), 10);

      var oldZoom = lastZoom;
      var newZoom = zoom;

      var newX = (x / oldZoom * newZoom + width / 2) - width / 2 / oldZoom * newZoom;
      var newY = (y / oldZoom * newZoom + height / 2) - height / 2 / oldZoom * newZoom;

      start.x = newX;
      start.y = newY;

      $bg.css('background-position', newX + 'px ' + newY + 'px');
      $offsetX.val(Math.round(newX));
      $offsetY.val(Math.round(newY));

      lastZoom = zoom;
    }
  };

  var Zoom = (function () {
    var minZoom;
    var maxZoom;

    return {
      setup: function(imageSize, bgSize) {
        var widthRatio = bgSize.width / imageSize.width;
        var heightRatio = bgSize.height / imageSize.height;
        minZoom = widthRatio > heightRatio ? widthRatio : heightRatio;

        maxZoom = minZoom < 1 ? 1 : minZoom;
      },

      get: function(val) {
        return val * (maxZoom - minZoom) + minZoom;
      }
    }
  })();
};

ImageEditor.prototype.$ = function (selector) {
  return this.$el.find(selector);
};