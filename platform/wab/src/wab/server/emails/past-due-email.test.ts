import { setupEmailTest } from "@/wab/server/emails/__testonly__/email-test-util";
import { sendPastDueEmail } from "@/wab/server/emails/past-due-email";
import { TeamId } from "@/wab/shared/ApiSchema";
import { Temporal } from "temporal-polyfill";

describe("sendPastDueEmail", () => {
  it("sends an email", async () => {
    const { config, mailer } = setupEmailTest();
    await sendPastDueEmail(mailer, config, {
      team: { id: "123" as TeamId, name: "My Company" },
      toEmails: ["billing@example.com", "owner@example.com"],
      lastDay: Temporal.PlainDate.from("2026-11-18"),
    });
    expect(mailer.sendMail.mock.calls).toMatchInlineSnapshot(`
      [
        [
          {
            "bcc": "bcc@example.com",
            "from": "from@example.com",
            "subject": "Action needed: Plasmic editing for My Company is available through November 18, 2026",
            "text": "We could not collect payment for your Plasmic organization "My Company".

      You can continue editing in Plasmic Studio through November 18, 2026. After that, editing will pause unless payment has gone through. Your projects and published sites are not affected.

      Update your payment method here:
      https://studio.plasmic.app/orgs/123/billing

      If you have already paid, no action is needed. Access continues automatically once payment goes through.",
            "to": [
              "billing@example.com",
              "owner@example.com",
            ],
          },
        ],
      ]
    `);
  });
});
