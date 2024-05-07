import styles from "@/wab/client/components/widgets/PublishSpinner.module.scss";
import { Spin } from "antd";
import * as React from "react";

export default function PublishSpinner() {
  return <Spin className={styles.spin} />;
}
