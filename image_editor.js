(function() {

  var ImageEditor = function(options) {
    this.$el = options.$el;
    var $fileInput = options.$fileInput || this.$('input[name="image"]');
    var $hiddenImage = $('<img class="image-hidden-preview" style="display: none" />').appendTo(this.$el);
    var $imageSize = this.$('.image-zoom-level');
    var $offsetX = $('<input name="offset_x" type="hidden" value="0" />').appendTo(this.$el);
    var $offsetY = $('<input name="offset_y" type="hidden" value="0" />').appendTo(this.$el);
    var $preview = options.$preview || this.$('.image-preview');

    if (options.width) {
      $preview.width(options.width);
    }
    if (options.height) {
      $preview.height(options.height);
    }
    var previewSize = {
      w: options.width || $preview.width(),
      h: options.height || $preview.height()
    };

    if (options.imageBackground) {
      var imageBackgroundBorderSize = options.imageBackgroundBorderSize || 0;
      var $previewContainer = options.$previewContainer || this.$('.image-preview-container');
      var $imageBg = $('<img />')
        .addClass('image-background')
        .css({
          position: 'absolute'
        });
      var $imageBgContainer = $('<div />')
        .addClass('image-background-container')
        .css({
          position: 'absolute',
          zIndex: 0,
          top: -imageBackgroundBorderSize,
          left: -imageBackgroundBorderSize,
          width: previewSize.w + imageBackgroundBorderSize * 2,
          height: previewSize.h + imageBackgroundBorderSize * 2
        }).append($imageBg);
      $previewContainer
        .css('position', 'relative')
        .prepend($imageBgContainer);
      $preview.css('position', 'relative');
      var imageBgPreviewOffset = {
        x: window.parseInt($preview.css('border-left-width')) + imageBackgroundBorderSize,
        y: window.parseInt($preview.css('border-top-width')) + imageBackgroundBorderSize
      };
    }

    var initialZoomSliderPos = 0;
    var disabled = true;
    var exportZoom = options.exportZoom || 1;

    var imageData = (options.imageState && (options.imageState.data || options.imageState.url)) || null;
    var sliderPos = (options.imageState && options.imageState.sliderPos) || initialZoomSliderPos;
    var lastZoom = (options.imageState && options.imageState.zoom) || null;

    var imageSize;

    var offset = (options.imageState && options.imageState.offset) || { x: 0, y: 0 };
    var origin = { x: 0, y: 0 };
    var movecontinue = false;

    var fixOffset = function(offset) {
      if (imageSize.w * lastZoom <= previewSize.w) {
        offset.x = 0;
      } else if (offset.x > 0) {
        offset.x = 0;
      } else if (offset.x + imageSize.w * lastZoom < previewSize.w) {
        offset.x = previewSize.w - imageSize.w * lastZoom;
      }

      if (imageSize.h * lastZoom <= previewSize.h) {
        offset.y = 0;
      } else if (offset.y > 0) {
        offset.y = 0;
      } else if (offset.y + imageSize.h * lastZoom < previewSize.h) {
        offset.y = previewSize.h - imageSize.h * lastZoom;
      }

      offset.x = Math.round(offset.x);
      offset.y = Math.round(offset.y);

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
      $preview.unbind('mousemove', move);

      if (e.type === 'mousedown') {
        origin.x = e.clientX;
        origin.y = e.clientY;
        movecontinue = true;
        $preview.bind('mousemove', move);
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
      if (options.onFileChange) {
        options.onFileChange();
      }

      var oFReader = new FileReader();
      var file = $fileInput.get(0).files[0];
      oFReader.readAsDataURL(file);
      oFReader.onload = function(oFREvent) {
        imageData = oFREvent.target.result;
        sliderPos = initialZoomSliderPos;
        offset = { x: 0, y: 0 };
        loadImage(imageData, sliderPos);
      };
    });

    var loadImage = function(imageData, sliderPos) {
      $hiddenImage.attr('src', imageData);

      $preview.css('background-image', 'url(' + imageData + ')');

      if (options.onImageLoading) {
        options.onImageLoading();
      }

      $hiddenImage.load(function() {
        if (options.imageBackground) {
          $imageBg.attr('src', imageData);
        }

        imageSize = {
          w: $hiddenImage.width(),
          h: $hiddenImage.height()
        };

        Zoom.setup(imageSize, previewSize);

        $imageSize.val(sliderPos);
        lastZoom = Zoom.get(sliderPos);

        updateImage();

        disabled = false;

        if (options.onImageLoaded) {
          options.onImageLoaded();
        }
      });
    };

    var updateImage = function() {
      sliderPos = Number($imageSize.val());
      if (imageSize && imageSize.w && imageSize.h) {
        var zoom = Zoom.get(sliderPos);
        var updatedWidth = Math.round(imageSize.w * zoom);
        var updatedHeight = Math.round(imageSize.h * zoom);

        var oldZoom = lastZoom;
        var newZoom = zoom;

        var newX = (offset.x / oldZoom * newZoom + previewSize.w / 2) - previewSize.w / 2 / oldZoom * newZoom;
        var newY = (offset.y / oldZoom * newZoom + previewSize.h / 2) - previewSize.h / 2 / oldZoom * newZoom;


        updateImageOffset({ x: newX, y: newY });
        $preview.css('background-size', updatedWidth + 'px ' + updatedHeight + 'px');
        if (options.imageBackground) {
          $imageBg.css({
            width: updatedWidth,
            height: updatedHeight
          });
        }

        lastZoom = zoom;
      }
    };

    var updateImageOffset = function(position) {
      offset = fixOffset(position);
      $preview.css('background-position', position.x + 'px ' + position.y + 'px');
      if (options.imageBackground) {
        $imageBg.css({
          left: offset.x + imageBgPreviewOffset.x,
          top: offset.y + imageBgPreviewOffset.y
        });
      }
      $offsetX.val(Math.round(position.x));
      $offsetY.val(Math.round(position.y));
    };

    var Zoom = (function() {
      var minZoom;
      var maxZoom;

      return {
        setup: function(imageSize, previewSize) {
          var widthRatio = previewSize.w / imageSize.w;
          var heightRatio = previewSize.h / imageSize.h;
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
    }());

    $preview.bind('mousedown mouseup mouseleave', handle);
    $preview.bind('dblclick', reset);

    $imageSize.on('change mousemove', updateImage);

    this.isZoomable = function() {
      return Zoom.isZoomable();
    };

    this.getCroppedImage = function() {
      if (!imageData) {
        return '';
      }

      var croppedSize = {
        w: previewSize.w,
        h: previewSize.h
      };
      if (options.fitWidth && !options.fitHeight) {
        if (imageSize.h * lastZoom < previewSize.h) {
          croppedSize.h = imageSize.h * lastZoom;
        }
      } else if (options.fitHeight && !options.fitWidth) {
        if (imageSize.w * lastZoom < previewSize.w) {
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
      if (!imageSize) {
        return null;
      }

      return {
        width: imageSize.w,
        height: imageSize.h
      };
    };

    if (options.imageState && (options.imageState.data || options.imageState.url)) {
      loadImage(imageData, sliderPos);
    }
  };

  ImageEditor.prototype.$ = function(selector) {
    return this.$el.find(selector);
  };

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = ImageEditor;
  } else {
    this.ImageEditor = ImageEditor;
  }

})(this);
