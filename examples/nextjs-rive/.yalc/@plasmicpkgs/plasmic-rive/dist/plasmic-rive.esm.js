import registerComponent from '@plasmicapp/host/registerComponent';
import React from 'react';
import { Layout, useRive, StateMachineInputType } from '@rive-app/react-canvas';
import { usePlasmicCanvasContext } from '@plasmicapp/host';

function _objectWithoutPropertiesLoose(r, e) {
  if (null == r) return {};
  var t = {};
  for (var n in r) if ({}.hasOwnProperty.call(r, n)) {
    if (-1 !== e.indexOf(n)) continue;
    t[n] = r[n];
  }
  return t;
}

var _excluded = ["layout", "className", "onStateChange", "stateMachines"];
var RivePlayer = /*#__PURE__*/React.forwardRef(function (_ref, ref) {
  var layout = _ref.layout,
    className = _ref.className,
    _onStateChange = _ref.onStateChange,
    stateMachines = _ref.stateMachines,
    props = _objectWithoutPropertiesLoose(_ref, _excluded);
  var inEditor = usePlasmicCanvasContext();
  var riveLayout = layout ? new Layout({
    fit: layout.fit,
    alignment: layout.alignment,
    minX: layout.minX,
    minY: layout.minY,
    maxX: layout.maxX,
    maxY: layout.maxY
  }) : undefined;
  // Always create a new riveParams/options object when any relevant prop changes
  var riveParams = React.useMemo(function () {
    return {
      src: props.src,
      artboard: props.artboard,
      animations: props.animations,
      stateMachines: stateMachines,
      layout: riveLayout,
      autoplay: inEditor ? props.studioAutoplay : props.autoplay,
      onStateChange: function onStateChange(event) {
        if (_onStateChange) {
          _onStateChange(event);
        }
      }
    };
  }, [props.src, props.artboard, props.animations, props.autoplay, props.studioAutoplay, riveLayout, stateMachines, inEditor, _onStateChange]);
  var _useRive = useRive(riveParams),
    rive = _useRive.rive,
    RiveComponent = _useRive.RiveComponent;
  React.useImperativeHandle(ref, function () {
    return {
      setBoolean: function setBoolean(name, value, stateMachine) {
        setInput(StateMachineInputType.Boolean, name, value, stateMachine);
      },
      setNumber: function setNumber(name, value, stateMachine) {
        setInput(StateMachineInputType.Number, name, value, stateMachine);
      },
      fire: function fire(name, stateMachine) {
        setInput(StateMachineInputType.Trigger, name, null, stateMachine);
      },
      play: function play(animationName) {
        rive == null || rive.play(animationName);
      },
      pause: function pause(animationName) {
        rive == null || rive.pause(animationName);
      }
    };
  }, [rive]);
  function setInput(inputType, inputName, value, stateMachine) {
    if (value === void 0) {
      value = null;
    }
    if (stateMachine === void 0) {
      stateMachine = null;
    }
    var inputs = rive == null ? void 0 : rive.stateMachineInputs(stateMachine || stateMachines);
    (inputs || []).forEach(function (i) {
      if (i.type !== inputType) {
        console.warn("PlasmicRive: Input type mismatch: expected " + inputType + ", got " + i.type);
      }
      if (i.name === inputName) {
        switch (inputType) {
          case StateMachineInputType.Trigger:
            i.fire();
            break;
          case StateMachineInputType.Number:
          case StateMachineInputType.Boolean:
            i.value = value;
            break;
        }
      }
    });
  }
  // In Plasmic Studio, force a remount by changing the key when any relevant prop changes
  var studioKey = React.useMemo(function () {
    return inEditor ? [props.src, props.artboard, props.animations, props.autoplay, props.studioAutoplay, JSON.stringify(layout), stateMachines, Date.now()].join("|") : undefined;
  }, [inEditor, props.src, props.artboard, props.animations, props.autoplay, props.studioAutoplay, layout, stateMachines]);
  return React.createElement(RiveComponent, {
    className: className,
    key: studioKey
  });
});
var riveMetaDescriptor = {
  name: "rive",
  displayName: "Rive",
  importName: "Rive",
  importPath: "@plasmicpkgs/plasmic-rive",
  description: "Rive animation component",
  props: {
    src: {
      type: "string",
      defaultValue: "https://cdn.rive.app/animations/vehicles.riv",
      displayName: "Source URL",
      description: "URL to the .riv file (exported from Rive)"
    },
    stateMachines: {
      type: "string",
      displayName: "State Machines",
      description: "(optional) Name of state machine to load.",
      advanced: true
    },
    autoplay: {
      type: "boolean",
      displayName: "Autoplay",
      description: "Should animation play automatically.",
      defaultValue: true,
      advanced: true
    },
    studioAutoplay: {
      type: "boolean",
      displayName: "Studio Autoplay",
      description: "Should animation play automatically in Plasmic Studio.",
      defaultValue: false,
      advanced: true
    },
    artboard: {
      type: "string",
      displayName: "Artboard",
      description: "(optional) Name of the artboard to use.",
      advanced: true
    },
    layout: {
      type: "object",
      displayName: "Layout",
      description: "(optional) Layout object to define how animations are displayed on the canvas.",
      advanced: true,
      fields: {
        fit: {
          type: "choice",
          displayName: "Fit",
          options: ["cover", "contain", "fill", "fitWidth", "fitHeight", "none", "scaleDown"],
          description: "How the animation should fit in the canvas."
        },
        alignment: {
          type: "choice",
          displayName: "Alignment",
          options: ["center", "topLeft", "topCenter", "topRight", "centerLeft", "centerRight", "bottomLeft", "bottomCenter", "bottomRight"],
          description: "How the animation should be aligned in the canvas."
        },
        minX: {
          type: "number",
          displayName: "Min X",
          advanced: true
        },
        minY: {
          type: "number",
          displayName: "Min Y",
          advanced: true
        },
        maxX: {
          type: "number",
          displayName: "Max X",
          advanced: true
        },
        maxY: {
          type: "number",
          displayName: "Max Y",
          advanced: true
        }
      }
    },
    animations: {
      type: "string",
      displayName: "Animations",
      description: "(optional) Name or list of names of animations to play.",
      advanced: true
    },
    onStateChange: {
      type: "eventHandler",
      displayName: "On State Change",
      description: "(optional) Callback when the state changes.",
      advanced: true,
      argTypes: [{
        name: "event",
        type: "object"
      }]
    }
  },
  refActions: {
    setBoolean: {
      description: "Set the Rive Input",
      argTypes: [{
        name: "name",
        type: "string",
        displayName: "Input Name"
      }, {
        name: "value",
        type: "boolean",
        displayName: "Input Value"
      }, {
        name: "stateMachine",
        type: "string",
        displayName: "State Machine Name"
      }]
    },
    setNumber: {
      description: "Set the Rive Input",
      argTypes: [{
        name: "name",
        type: "string",
        displayName: "Input Name"
      }, {
        name: "value",
        type: "number",
        displayName: "Input Value"
      }, {
        name: "stateMachine",
        type: "string",
        displayName: "State Machine Name"
      }]
    },
    fire: {
      description: "Fire the Rive Input",
      argTypes: [{
        name: "name",
        type: "string",
        displayName: "Input Name"
      }, {
        name: "stateMachine",
        type: "string",
        displayName: "State Machine Name"
      }]
    },
    play: {
      description: "Play the animation",
      argTypes: [{
        name: "animationName",
        type: "string",
        displayName: "Animation Name"
      }]
    },
    pause: {
      description: "Pause the animation",
      argTypes: [{
        name: "animationName",
        type: "string",
        displayName: "Animation Name"
      }]
    }
  }
};
function registerPlasmicRive(loader) {
  if (loader) {
    loader.registerComponent(RivePlayer, riveMetaDescriptor);
  } else {
    registerComponent(RivePlayer, riveMetaDescriptor);
  }
}

export default RivePlayer;
export { registerPlasmicRive, riveMetaDescriptor };
//# sourceMappingURL=plasmic-rive.esm.js.map
