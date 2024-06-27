import { Textbox } from "@/wab/client/components/widgets/Textbox";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { ScreenSizeSpec } from "@/wab/shared/css-size";
import { ResponsiveStrategy } from "@/wab/shared/responsiveness";
import { getResponsiveStrategy } from "@/wab/shared/core/sites";
import { Button, Col, Row } from "antd";
import { observer } from "mobx-react";
import React, { FormEvent, useState } from "react";

export const NewScreenVariantForm = observer(NewScreenVariantForm_);
function NewScreenVariantForm_(props: {
  isVisible?: boolean;
  onSubmit: () => void;
}) {
  const studioCtx = useStudioCtx();
  const [name, setName] = useState("");
  const [minWidth, setMinWidth] = useState("");
  const [maxWidth, setMaxWidth] = useState("");

  const strategy = getResponsiveStrategy(studioCtx.site);
  const isUnknownStrategy = strategy === ResponsiveStrategy.unknown;
  const isMobileFirst = strategy === ResponsiveStrategy.mobileFirst;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    await studioCtx.changeUnsafe(() => {
      const minWidthNumber = minWidth
        ? parseInt(minWidth.replace(/[^0-9.]/g, ""))
        : undefined;
      const maxWidthNumber = maxWidth
        ? parseInt(maxWidth.replace(/[^0-9.]/g, ""))
        : undefined;

      if (!minWidthNumber && !maxWidthNumber) {
        return;
      }

      const spec = new ScreenSizeSpec(minWidthNumber, maxWidthNumber);
      studioCtx.tplMgr().createScreenVariant({ name, spec });
    });

    setMinWidth("");
    setMaxWidth("");
    setName("");

    props.onSubmit();
  };

  return (
    <form onSubmit={handleSubmit}>
      <Row gutter={8} style={{ width: isUnknownStrategy ? 350 : 320 }}>
        <Col span={isUnknownStrategy ? 7 : 10}>
          <Textbox
            autoFocus
            required
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Col>
        {isUnknownStrategy && (
          <Col span={6}>
            <Textbox
              type="number"
              min={1}
              style={{ width: "100%" }}
              placeholder={"Min W"}
              value={minWidth}
              onChange={(e) => setMinWidth(e.target.value)}
            />
          </Col>
        )}
        <Col span={isUnknownStrategy ? 6 : 9}>
          <Textbox
            type="number"
            min={1}
            style={{ width: "100%" }}
            placeholder={isMobileFirst ? "Min W" : "Max W"}
            value={isMobileFirst ? minWidth : maxWidth}
            onChange={(e) =>
              isMobileFirst
                ? setMinWidth(e.target.value)
                : setMaxWidth(e.target.value)
            }
          />
        </Col>
        <Col span={5}>
          <Button block type="primary" htmlType="submit">
            Add
          </Button>
        </Col>
      </Row>
    </form>
  );
}
