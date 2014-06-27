window.ImageEditor = function(options) {
  this.$el = options.$el;
  var $fileInput = options.$fileInput || this.$('input[name="image"]');
  var $hiddenImage = $('<img class="image-hidden-preview" style="display: none" />').appendTo(this.$el);
  var $imageSize = this.$('.image-zoom-level');
  var $offsetX = $('<input name="offset_x" type="hidden" value="0" />').appendTo(this.$el);
  var $offsetY = $('<input name="offset_y" type="hidden" value="0" />').appendTo(this.$el);
  var $bg = options.$preview || $('.image-preview');

  var initialZoomSliderPos = 0;
  var disabled = true;
  var exportZoom = options.exportZoom || 1;

  var imageData = (options.imageState && options.imageState.data) || null;
  var sliderPos = (options.imageState && options.imageState.sliderPos) || null;
  var lastZoom = (options.imageState && options.imageState.zoom) || null;

  if (options.width) {
    $bg.width(options.width);
  }
  if (options.height) {
    $bg.height(options.height);
  }
  var bgSize = {
    w: options.width || $bg.width(),
    h: options.height || $bg.height()
  };
  var imageSize;

  var offset = (options.imageState && options.imageState.offset) || { x: 0, y: 0 };
  var origin = { x: 0, y: 0 };
  var movecontinue = false;

  var fixOffset = function(offset) {
    if (imageSize.w * lastZoom <= bgSize.w) {
      offset.x = 0;
    } else if (offset.x > 0) {
      offset.x = 0;
    } else if (offset.x + imageSize.w * lastZoom < bgSize.w) {
      offset.x = bgSize.w - imageSize.w * lastZoom;
    }

    if (imageSize.h * lastZoom <= bgSize.h) {
      offset.y = 0
    } else if (offset.y > 0) {
      offset.y = 0;
    } else if (offset.y + imageSize.h * lastZoom < bgSize.h) {
      offset.y = bgSize.h - imageSize.h * lastZoom;
    }

    return offset;
  };

  var move = function(e) {
    if (movecontinue) {
      offset = {
        x: offset.x + e.clientX - origin.x,
        y: offset.y + e.clientY - origin.y
      };

      updateImageOffset(offset);
    }

    origin.x = e.clientX;
    origin.y = e.clientY;

    e.stopPropagation();
    return false;
  };

  var handle = function(e) {
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
  };

  var reset = function() {
    updateImageOffset({ x: 0, y: 0 });
  };

  // Read image locally
  $fileInput.on('change', function() {
    options.onFileChange && options.onFileChange();

    var oFReader = new FileReader();
    var file = $fileInput.get(0).files[0];
    oFReader.readAsDataURL(file);
    oFReader.onload = function(oFREvent) {
      imageData = oFREvent.target.result;
      sliderPos = initialZoomSliderPos;
      loadImage(imageData, sliderPos);
    };
  });

  var loadImage = function(imageData, sliderPos) {
    $bg.css('background-image', 'url(' + imageData + ')');
    $hiddenImage.attr('src', imageData);

    imageSize = {
      w: $hiddenImage.width(),
      h: $hiddenImage.height()
    };

    Zoom.setup(imageSize, bgSize);

    $imageSize.val(sliderPos);
    lastZoom = Zoom.get(sliderPos);

    updateImage();

    disabled = false;

    options.onImageLoaded && options.onImageLoaded();
  };

  var updateImage = function() {
    sliderPos = Number($imageSize.val());
    if (imageSize && imageSize.w && imageSize.h) {
      var zoom = Zoom.get(sliderPos);
      var updatedWidth = Math.round(imageSize.w * zoom);
      var updatedHeight = Math.round(imageSize.h * zoom);

      var oldZoom = lastZoom;
      var newZoom = zoom;

      var newX = (offset.x / oldZoom * newZoom + bgSize.w / 2) - bgSize.w / 2 / oldZoom * newZoom;
      var newY = (offset.y / oldZoom * newZoom + bgSize.h / 2) - bgSize.h / 2 / oldZoom * newZoom;

      updateImageOffset({ x: newX, y: newY });
      $bg.css('background-size', updatedWidth + 'px ' + updatedHeight + 'px');

      lastZoom = zoom;
    }
  };

  var updateImageOffset = function(position) {
    offset = fixOffset(position);
    $bg.css('background-position', position.x + 'px ' + position.y + 'px');
    $offsetX.val(Math.round(position.x));
    $offsetY.val(Math.round(position.y));
  };

  var Zoom = (function() {
    var minZoom;
    var maxZoom;

    return {
      setup: function(imageSize, bgSize) {
        var widthRatio = bgSize.w / imageSize.w;
        var heightRatio = bgSize.h / imageSize.h;
        if (options.fitWidth && !options.fitHeight) {

          minZoom = widthRatio;
        } else if (options.fitHeight && !options.fitWidth) {
          minZoom = heightRatio;
        } else if (options.fitWidth && options.fitHeight) {
          minZoom = widthRatio < heightRatio ? widthRatio : heightRatio;
        } else {
          minZoom = widthRatio < heightRatio ? heightRatio : widthRatio;
        }

        maxZoom = minZoom < 1 / exportZoom ? 1 / exportZoom : minZoom;
      },

      get: function(sliderPos) {
        return sliderPos * (maxZoom - minZoom) + minZoom;
      },

      isZoomable: function() {
        return minZoom !== maxZoom;
      }
    };
  })();

  $bg.bind('mousedown mouseup mouseleave', handle);
  $bg.bind('dblclick', reset);

  $imageSize.on('change mousemove', updateImage);

  this.isZoomable = function() {
    return Zoom.isZoomable();
  };

  this.getCroppedImage = function() {
    var croppedSize = {
      w: bgSize.w,
      h: bgSize.h
    };
    if (options.fitWidth && !options.fitHeight) {
      if (imageSize.h * lastZoom < bgSize.h) {
        croppedSize.h = imageSize.h * lastZoom;
      }
    } else if (options.fitHeight && !options.fitWidth) {
      if (imageSize.w * lastZoom < bgSize.w) {
        croppedSize.w = imageSize.w * lastZoom;
      }
    }

    var $canvas = $('<canvas />')
      .attr({
        style: 'display: none;',
        width: croppedSize.w * exportZoom,
        height: croppedSize.h * exportZoom
      })
      .appendTo(this.$el);
    var canvasContext = $canvas[0].getContext('2d');

    canvasContext.drawImage($hiddenImage[0],
      offset.x * exportZoom, offset.y * exportZoom,
      lastZoom * exportZoom * imageSize.w, lastZoom * exportZoom * imageSize.h);

    return $canvas[0].toDataURL();
  };

  this.getImageState = function() {
    return {
      data: imageData,
      offset: offset,
      zoom: lastZoom,
      sliderPos: sliderPos
    };
  };

  this.getImageSize = function() {
    return {
      width: imageSize.w,
      height: imageSize.h
    };
  };

  if (options.imageState) {
    loadImage(imageData, sliderPos);
  }
};

ImageEditor.prototype.$ = function(selector) {
  return this.$el.find(selector);
};
