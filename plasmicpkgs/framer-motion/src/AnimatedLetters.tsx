import registerComponent from "@plasmicapp/host/registerComponent";
import { motion, Variants } from "framer-motion";
import React from "react";

export default function AnimatedLetters({
  className,
  text = "Enter some text",
  stagger = 0.01,
  initial = {
    opacity: 0,
    y: "100%",
  },
  visible = {
    opacity: 1,
    y: 0,
    transition: {
      ease: "easeOut",
    },
  },
  exit = {
    opacity: 0,
    y: "-100%",
  },
}: {
  className?: string;
  text?: string;
  stagger?: number;
  initial?: any;
  visible?: any;
  exit?: any;
}) {
  const letterVariants: Variants = {
    initial: initial,
    visible: (i) => ({
      ...visible,
      transition: {
        ...visible?.transition,
        delay: (visible?.transition?.delay ?? 0) + i * stagger,
      },
    }),
    exit: (i) => ({
      ...exit,
      transition: {
        ...exit?.transition,
        delay: (exit?.transition?.delay ?? 0) + i * stagger,
      },
    }),
  };

  return (
    <motion.div
      className={className}
      initial="initial"
      animate="visible"
      exit={"exit"}
    >
      {text.split("").map((letter, i) => (
        <motion.span
          key={i}
          custom={i}
          style={{ display: "inline-block" }}
          variants={letterVariants}
        >
          {letter === " " ? "\u00a0" : letter}
        </motion.span>
      ))}
    </motion.div>
  );
}

registerComponent(AnimatedLetters, {
  name: "AnimatedLetters",
  displayName: "Animated Letters",
  importPath: "@plasmicpkgs/framer-motion/dist/AnimatedLetters",
  props: {
    text: {
      type: "string",
      defaultValue: "Animated Letters",
      displayName: "Text",
      description: "Text to animate.",
    },
    stagger: {
      type: "number",
      displayName: "Stagger",
      description: "Seconds to wait between each letter",
    },
    initial: {
      type: "object",
      displayName: "Initial state",
      description: "What the letters look like before entrance animation",
    },
    visible: {
      type: "object",
      displayName: "Visible state",
      description: "What the letters look like once revealed",
    },
    exit: {
      type: "object",
      displayName: "Exit state",
      description: "What the letters look like after exit animation",
    },
  },
  isDefaultExport: true,
  defaultStyles: {
    width: "stretch",
    maxWidth: "800px",
  },
});
