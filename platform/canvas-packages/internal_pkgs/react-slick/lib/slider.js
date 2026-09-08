"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;
var _react = _interopRequireDefault(require("react"));
var _innerSlider = require("./inner-slider");
var _json2mq = _interopRequireDefault(require("json2mq"));
var _defaultProps = _interopRequireDefault(require("./default-props"));
var _innerSliderUtils = require("./utils/innerSliderUtils");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { "default": e }; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) { ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } } return n; }, _extends.apply(null, arguments); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
function _createSuper(t) { var r = _isNativeReflectConstruct(); return function () { var e, o = _getPrototypeOf(t); if (r) { var s = _getPrototypeOf(this).constructor; e = Reflect.construct(o, arguments, s); } else e = o.apply(this, arguments); return _possibleConstructorReturn(this, e); }; }
function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var Slider = exports["default"] = /*#__PURE__*/function (_React$Component) {
  _inherits(Slider, _React$Component);
  var _super = _createSuper(Slider);
  function Slider(props) {
    var _this;
    _classCallCheck(this, Slider);
    _this = _super.call(this, props);
    _defineProperty(_assertThisInitialized(_this), "innerSliderRefHandler", function (ref) {
      return _this.innerSlider = ref;
    });
    _defineProperty(_assertThisInitialized(_this), "slickPrev", function () {
      return _this.innerSlider.slickPrev();
    });
    _defineProperty(_assertThisInitialized(_this), "slickNext", function () {
      return _this.innerSlider.slickNext();
    });
    _defineProperty(_assertThisInitialized(_this), "slickGoTo", function (slide) {
      var dontAnimate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      return _this.innerSlider.slickGoTo(slide, dontAnimate);
    });
    _defineProperty(_assertThisInitialized(_this), "slickPause", function () {
      return _this.innerSlider.pause("paused");
    });
    _defineProperty(_assertThisInitialized(_this), "slickPlay", function () {
      return _this.innerSlider.autoPlay("play");
    });
    _this.state = {
      breakpoint: null
    };
    _this._responsiveMediaHandlers = [];
    return _this;
  }
  _createClass(Slider, [{
    key: "media",
    value: function media(query, handler) {
      // javascript handler for  css media query
      var mql = window.matchMedia(query);
      var listener = function listener(_ref) {
        var matches = _ref.matches;
        if (matches) {
          handler();
        }
      };
      mql.addListener(listener);
      // react-slick 0.30 replaced enquire.js with matchMedia. enquire ran the
      // handler on register when the query already matched; addListener does
      // not, so the initial breakpoint was never applied until the first resize
      // crossed one. Assess once here to restore the pre-0.30 behavior.
      if (mql.matches) {
        handler();
      }
      this._responsiveMediaHandlers.push({
        mql: mql,
        query: query,
        listener: listener
      });
    } // handles responsive breakpoints
  }, {
    key: "componentDidMount",
    value: function componentDidMount() {
      var _this2 = this;
      // performance monitoring
      //if (process.env.NODE_ENV !== 'production') {
      //const { whyDidYouUpdate } = require('why-did-you-update')
      //whyDidYouUpdate(React)
      //}
      if (this.props.responsive) {
        var breakpoints = this.props.responsive.map(function (breakpt) {
          return breakpt.breakpoint;
        });
        // sort them in increasing order of their numerical value
        breakpoints.sort(function (x, y) {
          return x - y;
        });
        breakpoints.forEach(function (breakpoint, index) {
          // media query for each breakpoint
          var bQuery;
          if (index === 0) {
            bQuery = (0, _json2mq["default"])({
              minWidth: 0,
              maxWidth: breakpoint
            });
          } else {
            bQuery = (0, _json2mq["default"])({
              minWidth: breakpoints[index - 1] + 1,
              maxWidth: breakpoint
            });
          }
          // when not using server side rendering
          (0, _innerSliderUtils.canUseDOM)() && _this2.media(bQuery, function () {
            _this2.setState({
              breakpoint: breakpoint
            });
          });
        });

        // Register media query for full screen. Need to support resize from small to large
        // convert javascript object to media query string
        var query = (0, _json2mq["default"])({
          minWidth: breakpoints.slice(-1)[0]
        });
        (0, _innerSliderUtils.canUseDOM)() && this.media(query, function () {
          _this2.setState({
            breakpoint: null
          });
        });
      }
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      this._responsiveMediaHandlers.forEach(function (obj) {
        obj.mql.removeListener(obj.listener);
      });
    }
  }, {
    key: "render",
    value: function render() {
      var _this3 = this;
      var settings;
      var newProps;
      if (this.state.breakpoint) {
        newProps = this.props.responsive.filter(function (resp) {
          return resp.breakpoint === _this3.state.breakpoint;
        });
        settings = newProps[0].settings === "unslick" ? "unslick" : _objectSpread(_objectSpread(_objectSpread({}, _defaultProps["default"]), this.props), newProps[0].settings);
      } else {
        settings = _objectSpread(_objectSpread({}, _defaultProps["default"]), this.props);
      }

      // force scrolling by one if centerMode is on
      if (settings.centerMode) {
        if (settings.slidesToScroll > 1 && process.env.NODE_ENV !== "production") {
          console.warn("slidesToScroll should be equal to 1 in centerMode, you are using ".concat(settings.slidesToScroll));
        }
        settings.slidesToScroll = 1;
      }
      // force showing one slide and scrolling by one if the fade mode is on
      if (settings.fade) {
        if (settings.slidesToShow > 1 && process.env.NODE_ENV !== "production") {
          console.warn("slidesToShow should be equal to 1 when fade is true, you're using ".concat(settings.slidesToShow));
        }
        if (settings.slidesToScroll > 1 && process.env.NODE_ENV !== "production") {
          console.warn("slidesToScroll should be equal to 1 when fade is true, you're using ".concat(settings.slidesToScroll));
        }
        settings.slidesToShow = 1;
        settings.slidesToScroll = 1;
      }

      // makes sure that children is an array, even when there is only 1 child
      var children = _react["default"].Children.toArray(this.props.children);

      // Children may contain false or null, so we should filter them
      // children may also contain string filled with spaces (in certain cases where we use jsx strings)
      children = children.filter(function (child) {
        if (typeof child === "string") {
          return !!child.trim();
        }
        return !!child;
      });

      // rows and slidesPerRow logic is handled here
      if (settings.variableWidth && (settings.rows > 1 || settings.slidesPerRow > 1)) {
        console.warn("variableWidth is not supported in case of rows > 1 or slidesPerRow > 1");
        settings.variableWidth = false;
      }
      var newChildren = [];
      var currentWidth = null;
      for (var i = 0; i < children.length; i += settings.rows * settings.slidesPerRow) {
        var newSlide = [];
        for (var j = i; j < i + settings.rows * settings.slidesPerRow; j += settings.slidesPerRow) {
          var row = [];
          for (var k = j; k < j + settings.slidesPerRow; k += 1) {
            if (settings.variableWidth && children[k].props.style) {
              currentWidth = children[k].props.style.width;
            }
            if (k >= children.length) break;
            row.push(/*#__PURE__*/_react["default"].cloneElement(children[k], {
              key: 100 * i + 10 * j + k,
              tabIndex: -1,
              style: {
                width: "".concat(100 / settings.slidesPerRow, "%"),
                display: "inline-block"
              }
            }));
          }
          newSlide.push(/*#__PURE__*/_react["default"].createElement("div", {
            key: 10 * i + j
          }, row));
        }
        if (settings.variableWidth) {
          newChildren.push(/*#__PURE__*/_react["default"].createElement("div", {
            key: i,
            style: {
              width: currentWidth
            }
          }, newSlide));
        } else {
          newChildren.push(/*#__PURE__*/_react["default"].createElement("div", {
            key: i
          }, newSlide));
        }
      }
      if (settings === "unslick") {
        var className = "regular slider " + (this.props.className || "");
        return /*#__PURE__*/_react["default"].createElement("div", {
          className: className
        }, children);
      } else if (newChildren.length <= settings.slidesToShow) {
        settings.unslick = true;
      }
      return /*#__PURE__*/_react["default"].createElement(_innerSlider.InnerSlider, _extends({
        style: this.props.style,
        ref: this.innerSliderRefHandler
      }, (0, _innerSliderUtils.filterSettings)(settings)), newChildren);
    }
  }]);
  return Slider;
}(_react["default"].Component);