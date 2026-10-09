import React from "react";
import {
  FaArrowDown,
  FaArrowLeft,
  FaArrowRight,
  FaArrowUp,
  FaRegHandRock,
} from "react-icons/fa";

function renderKey(key: string) {
  switch (key) {
    case "command":
      return "⌘";
    case "enter":
      return "↵";
    case "option":
      return "⌥";
    case "drag":
      return <FaRegHandRock />;
    case "left":
      return <FaArrowLeft />;
    case "right":
      return <FaArrowRight />;
    case "up":
      return <FaArrowUp />;
    case "down":
      return <FaArrowDown />;
  }
  if (key.length === 1 && key.toUpperCase() !== key.toLowerCase()) {
    // Capitalize single characters
    return key.toUpperCase();
  }
  return key;
}

export function comboToKeyLabels(combo: string) {
  const keys: string[] = [];
  if (combo === "+") {
    keys.push(combo);
  } else {
    // Split the combo by +. We cannot use string.split since we need to deal
    // with consecutive plus sign.
    let curItem = "";
    for (let i = 0; i < combo.length; i++) {
      if (curItem.length > 0 && combo.charAt(i) === "+") {
        keys.push(curItem);
        curItem = "";
      } else {
        curItem += combo.charAt(i);
      }
    }
    if (curItem.length > 0) {
      keys.push(curItem);
    }
  }

  return keys.map((k) => ({ label: renderKey(k), key: k }));
}
