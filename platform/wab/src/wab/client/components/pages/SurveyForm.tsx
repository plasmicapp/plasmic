import { isPlasmicPath } from "@/wab/client/cli-routes";
import "@/wab/client/components/pages/AuthForm.sass";
import { PageFooter } from "@/wab/client/components/pages/PageFooter";
import { Icon } from "@/wab/client/components/widgets/Icon";
import { useAppCtx } from "@/wab/client/contexts/AppContexts";
import MarkFullColorIcon from "@/wab/client/plasmic/plasmic_kit_design_system/PlasmicIcon__MarkFullColor";
import { SurveyRequest } from "@/wab/shared/ApiSchema";
import { APP_ROUTES } from "@/wab/shared/route/app-routes";
import { fillRoute } from "@/wab/shared/route/route";
import { AutoComplete, Button, Form, Tooltip } from "antd";
import * as React from "react";
import { ReactNode, useState } from "react";

function Label({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: "13px" }}>{children}</div>;
}

export function SurveyForm() {
  const appCtx = useAppCtx();
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [choseOther, setChoseOther] = useState({
    role: false,
    projectOption: false,
  });
  const continueToPath = new URLSearchParams(location.search).get("continueTo");
  const nextPath =
    continueToPath && isPlasmicPath(continueToPath)
      ? continueToPath
      : fillRoute(APP_ROUTES.emailVerification, {});

  const [form] = Form.useForm();

  function onChange(changed, data: SurveyRequest) {
    if (data.role === "Other (specify)") {
      setChoseOther({ ...choseOther, role: true });
      form.setFieldsValue({ ...data, role: "" });
    }
    if (data.projectOption === "Other (specify)") {
      setChoseOther({ ...choseOther, projectOption: true });
      form.setFieldsValue({ ...data, projectOption: "" });
    }
    if (data.source === "Google search (specify)") {
      form.setFieldsValue({ ...data, source: "Googled " });
    } else if (data.source === "Other (specify)") {
      form.setFieldsValue({ ...data, source: "" });
    }
  }
  async function onSubmit(data: SurveyRequest) {
    setSubmitting(true);
    try {
      if (appCtx.selfInfo && !appCtx.selfInfo.isFake) {
        await appCtx.api.updateSelfInfo({
          ...data,
          surveyResponse: { projectOption: data.projectOption },
          needsSurvey: false,
        });
        await appCtx.reloadAll();
      }
      appCtx.router.routeTo(nextPath);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={"LoginForm__Container"}>
      <div className={"LoginForm__Content"}>
        <div className={"LoginForm__Logo"}>
          <Tooltip title="Plasmic">
            <Icon icon={MarkFullColorIcon} style={{ width: 128, height: 64 }} />
          </Tooltip>
        </div>
        <div className={"LoginForm__Controls"}>
          <Form
            form={form}
            layout={"vertical"}
            onValuesChange={onChange}
            onFinish={onSubmit}
            className={"SurveyForm__Fields"}
          >
            <h2>Welcome to Plasmic!</h2>
            <Form.Item
              label={<Label>How did you hear about us?</Label>}
              name={"source"}
            >
              <AutoComplete
                allowClear
                size="large"
                placeholder={`Googled "react builder"`}
                options={[
                  { value: "Google search (specify)" },
                  { value: "Product Hunt" },
                  { value: "Reddit" },
                  { value: "Youtube" },
                  { value: "Twitter" },
                  { value: "Linkedin" },
                  { value: "Friend or colleague" },
                  { value: "Other (specify)" },
                ]}
              />
            </Form.Item>
            <Form.Item
              label={<Label>What kind of work do you do?</Label>}
              name={"role"}
            >
              <AutoComplete
                allowClear
                size="large"
                placeholder={
                  choseOther.role ? "Specify your role" : "Select a role"
                }
                options={[
                  { value: "Software development" },
                  { value: "Design" },
                  { value: "Marketing" },
                  { value: "Product management" },
                  { value: "Other (specify)" },
                ]}
              />
            </Form.Item>
            <Form.Item
              label={<Label>What do you want to build?</Label>}
              name={"projectOption"}
            >
              <AutoComplete
                allowClear
                size="large"
                placeholder={
                  choseOther.projectOption
                    ? "Specify your project type"
                    : "Select a project type"
                }
                options={[
                  { value: "Website" },
                  { value: "Internal tool" },
                  { value: "External app" },
                  { value: "Other (specify)" },
                ]}
              />
            </Form.Item>
            <Button
              loading={submitting}
              htmlType={"submit"}
              type={"primary"}
              size={"large"}
            >
              Continue
            </Button>
          </Form>
        </div>
        <PageFooter />
      </div>
    </div>
  );
}
