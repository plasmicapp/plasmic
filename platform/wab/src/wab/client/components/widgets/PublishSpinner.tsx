import { Spin } from "antd";
import * as React from "react";
import styles from "./PublishSpinner.module.scss";

export default function PublishSpinner() {
  return <Spin className={styles.spin} />;
}
